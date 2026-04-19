use axum::{
    routing::{get, post, put, delete},
    extract::{State, Json, Path, Query},
    Router,
    response::{Redirect},
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use dotenvy::dotenv;
use std::env;
use chrono::{NaiveDate, DateTime, Utc, Duration, TimeZone};
use tower_http::cors::CorsLayer;
use oauth2::{
    basic::BasicClient,
    AuthUrl, ClientId, ClientSecret, RedirectUrl, TokenUrl,
    AuthorizationCode, TokenResponse,
    Scope, CsrfToken,
};
use oauth2::reqwest::async_http_client;

#[derive(Clone)]
struct AppState {
    pool: PgPool,
    google_config: GoogleConfig,
}

#[derive(Clone)]
struct GoogleConfig {
    client_id: String,
    client_secret: String,
    redirect_url: String,
}

#[derive(Serialize, Deserialize, sqlx::FromRow, Clone)]
struct DiaryEntry {
    id: i32,
    entry_date: NaiveDate,
    content: serde_json::Value,
    mood_rating: Option<i32>,
}

#[derive(Serialize, Deserialize, sqlx::FromRow, Clone)]
struct Event {
    id: i32,
    event_name: String,
    start_time: DateTime<Utc>,
    end_time: DateTime<Utc>,
    category: String,
    notes: Option<String>,
    location: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct CreateTask {
    title: String,
    target_date: Option<NaiveDate>,
}

#[derive(Serialize, Deserialize)]
struct CreateEvent {
    event_name: String,
    start_time: DateTime<Utc>,
    end_time: DateTime<Utc>,
    category: String,
    notes: Option<String>,
    #[serde(default)]
    sync_to_google: bool,
    #[serde(default)]
    generate_meet_link: bool,
}

#[derive(Serialize, Deserialize)]
struct CreateDiary {
    entry_date: NaiveDate,
    content: serde_json::Value,
    mood_rating: Option<i32>,
}

#[derive(Serialize, Deserialize, sqlx::FromRow, Clone)]
struct Task {
    id: i32,
    title: String,
    is_completed: bool,
    target_date: NaiveDate,
}

#[derive(Serialize)]
struct MonthSummary {
    days: Vec<DayData>,
}

#[derive(serde::Serialize, sqlx::FromRow)] 
struct DayData {
    target_date: chrono::NaiveDate,
    task_count: i64,
    event_count: i64,
    has_diary: bool,
    mood_rating: Option<i32>,
}

#[derive(Serialize)]
struct DailySummary {
    tasks: Vec<Task>,
    events: Vec<Event>,
    diary: Option<DiaryEntry>,
    is_google_connected: bool,
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    let database_url = env::var("DATABASE_URL_UNPOOLED").expect("DATABASE_URL must be set");
    let google_client_id = env::var("GOOGLE_CLIENT_ID").expect("GOOGLE_CLIENT_ID must be set");
    let google_client_secret = env::var("GOOGLE_CLIENT_SECRET").expect("GOOGLE_CLIENT_SECRET must be set");
    let google_redirect_url = env::var("GOOGLE_REDIRECT_URL").expect("GOOGLE_REDIRECT_URL must be set");

    let pool = PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to Neon");

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    let state = AppState {
        pool,
        google_config: GoogleConfig {
            client_id: google_client_id,
            client_secret: google_client_secret,
            redirect_url: google_redirect_url,
        },
    };

    let cors = CorsLayer::permissive();

    let app = Router::new()
        .route("/tasks", get(get_tasks).post(create_task))
        .route("/tasks/{id}", put(update_task).delete(delete_task))
        .route("/events", get(get_events).post(create_event))
        .route("/events/{id}", put(update_event).delete(delete_event))
        .route("/diary", post(upsert_diary))
        .route("/stats", get(get_stats))
        .route("/calendar/{year}/{month}", get(get_month_view))
        .route("/day/{date}", get(get_daily_summary))
        .route("/habits", get(get_habits).post(create_habit))
        .route("/habits/{id}", delete(delete_habit))
        .route("/habits/logs", get(get_habit_logs).post(toggle_habit_log))
        .route("/auth/google/login", get(google_login))
        .route("/auth/google/callback", get(google_callback))
        .route("/auth/google/logout", delete(google_logout))
        .layer(cors)
        .with_state(state);

    let port = env::var("PORT").unwrap_or_else(|_| "5059".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    println!("Backend running on http://{}", addr);
    axum::serve(listener, app).await.unwrap();
}

// --- OAuth ---

fn get_google_client(config: &GoogleConfig) -> BasicClient {
    BasicClient::new(
        ClientId::new(config.client_id.clone()),
        Some(ClientSecret::new(config.client_secret.clone())),
        AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string()).unwrap(),
        Some(TokenUrl::new("https://oauth2.googleapis.com/token".to_string()).unwrap()),
    )
    .set_redirect_uri(RedirectUrl::new(config.redirect_url.clone()).unwrap())
}

async fn google_login(State(state): State<AppState>) -> Redirect {
    let client = get_google_client(&state.google_config);
    let (auth_url, _csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("https://www.googleapis.com/auth/calendar.events".to_string()))
        .add_scope(Scope::new("https://www.googleapis.com/auth/calendar.readonly".to_string()))
        .url();

    let final_url = format!("{}&access_type=offline&prompt=consent", auth_url.as_str());
    Redirect::to(&final_url)
}

#[derive(Deserialize)]
struct AuthRequest {
    code: String,
}

async fn google_logout(State(state): State<AppState>) -> &'static str {
    sqlx::query("DELETE FROM google_tokens").execute(&state.pool).await.unwrap();
    "Logged out"
}

async fn google_callback(
    State(state): State<AppState>,
    Query(query): Query<AuthRequest>,
) -> Redirect {
    let client = get_google_client(&state.google_config);
    let token_result = client
        .exchange_code(AuthorizationCode::new(query.code))
        .request_async(async_http_client)
        .await
        .expect("Failed to exchange code");

    let access_token = token_result.access_token().secret();
    let refresh_token = token_result.refresh_token().map(|t| t.secret().to_string());
    let expires_at = Utc::now() + Duration::seconds(token_result.expires_in().map(|d| d.as_secs()).unwrap_or(3600) as i64);

    sqlx::query(
        "INSERT INTO google_tokens (access_token, refresh_token, expires_at, updated_at) VALUES ($1, $2, $3, NOW())"
    )
    .bind(access_token)
    .bind(refresh_token)
    .bind(expires_at)
    .execute(&state.pool)
    .await
    .expect("Failed to save token");

    Redirect::to("http://localhost:3000/management?google=connected")
}

#[derive(sqlx::FromRow)]
struct GoogleTokenRow {
    access_token: String,
    refresh_token: Option<String>,
    expires_at: DateTime<Utc>,
}

async fn fetch_google_events(pool: &PgPool, date: NaiveDate) -> Vec<Event> {
    let token_row = sqlx::query_as::<_, GoogleTokenRow>(
        "SELECT access_token, refresh_token, expires_at FROM google_tokens ORDER BY updated_at DESC LIMIT 1"
    )
    .fetch_optional(pool)
    .await
    .unwrap();

    if let Some(row) = token_row {
        let client = reqwest::Client::new();
        let time_min = Utc.from_utc_datetime(&date.and_hms_opt(0, 0, 0).unwrap()).to_rfc3339();
        let time_max = Utc.from_utc_datetime(&date.and_hms_opt(23, 59, 59).unwrap()).to_rfc3339();
        
        let url = format!(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin={}&timeMax={}&singleEvents=true",
            time_min, time_max
        );

        let res = client.get(url)
            .bearer_auth(row.access_token)
            .send()
            .await;

        if let Ok(response) = res {
            if let Ok(data) = response.json::<serde_json::Value>().await {
                if let Some(items) = data["items"].as_array() {
                    return items.iter().filter_map(|item| {
                        let name = item["summary"].as_str()?.to_string();
                        let start = item["start"]["dateTime"].as_str().or(item["start"]["date"].as_str())?;
                        let end = item["end"]["dateTime"].as_str().or(item["end"]["date"].as_str())?;
                        
                        Some(Event {
                            id: -1,
                            event_name: format!("(Google) {}", name),
                            start_time: if start.contains('T') { DateTime::parse_from_rfc3339(start).ok()?.with_timezone(&Utc) } else { Utc.from_utc_datetime(&NaiveDate::parse_from_str(start, "%Y-%m-%d").ok()?.and_hms_opt(0,0,0)?) },
                            end_time: if end.contains('T') { DateTime::parse_from_rfc3339(end).ok()?.with_timezone(&Utc) } else { Utc.from_utc_datetime(&NaiveDate::parse_from_str(end, "%Y-%m-%d").ok()?.and_hms_opt(23,59,59)?) },
                            category: "External".to_string(),
                            notes: item["description"].as_str().map(|s| s.to_string()),
                            location: item["hangoutLink"].as_str().map(|s| s.to_string()).or_else(|| item["location"].as_str().map(|s| s.to_string())),
                        })
                    }).collect();
                }
            }
        }
    }
    vec![]
}

async fn get_stats(State(state): State<AppState>) -> Json<Stats> {
    let today = Utc::now().date_naive();
    let pending_tasks = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM tasks WHERE is_completed = false").fetch_one(&state.pool).await.unwrap_or(0);
    let completed_tasks = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM tasks WHERE is_completed = true").fetch_one(&state.pool).await.unwrap_or(0);
    let events_today = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM events WHERE start_time::date = $1").bind(today).fetch_one(&state.pool).await.unwrap_or(0);
    let todays_mood = sqlx::query_scalar::<_, Option<i32>>("SELECT mood_rating FROM diary_entries WHERE entry_date = $1").bind(today).fetch_optional(&state.pool).await.unwrap_or(None).flatten();
    Json(Stats { pending_tasks, completed_tasks, events_today, todays_mood })
}
async fn get_tasks(State(state): State<AppState>) -> Json<Vec<Task>> {
    let tasks = sqlx::query_as::<_, Task>("SELECT * FROM tasks ORDER BY target_date ASC").fetch_all(&state.pool).await.unwrap();
    Json(tasks)
}
async fn create_task(State(state): State<AppState>, Json(payload): Json<CreateTask>) -> Json<Task> {
    let target_date = payload.target_date.unwrap_or_else(|| Utc::now().date_naive());
    let task = sqlx::query_as::<_, Task>("INSERT INTO tasks (title, target_date) VALUES ($1, $2) RETURNING *").bind(payload.title).bind(target_date).fetch_one(&state.pool).await.unwrap();
    Json(task)
}
async fn update_task(State(state): State<AppState>, Path(id): Path<i32>, Json(payload): Json<Task>) -> Json<Task> {
    let task = sqlx::query_as::<_, Task>("UPDATE tasks SET title = $1, is_completed = $2, target_date = $3 WHERE id = $4 RETURNING *").bind(payload.title).bind(payload.is_completed).bind(payload.target_date).bind(id).fetch_one(&state.pool).await.unwrap();
    Json(task)
}
async fn delete_task(State(state): State<AppState>, Path(id): Path<i32>) -> &'static str {
    sqlx::query("DELETE FROM tasks WHERE id = $1").bind(id).execute(&state.pool).await.unwrap();
    "Deleted"
}
async fn get_events(State(state): State<AppState>) -> Json<Vec<Event>> {
    let events = sqlx::query_as::<_, Event>("SELECT * FROM events ORDER BY start_time ASC").fetch_all(&state.pool).await.unwrap();
    Json(events)
}
async fn create_event(State(state): State<AppState>, Json(payload): Json<CreateEvent>) -> Json<Event> {
    let mut event = sqlx::query_as::<_, Event>("INSERT INTO events (event_name, start_time, end_time, category, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *").bind(&payload.event_name).bind(&payload.start_time).bind(&payload.end_time).bind(&payload.category).bind(&payload.notes).fetch_one(&state.pool).await.unwrap();
    if payload.sync_to_google {
        let token_row = sqlx::query_as::<_, GoogleTokenRow>(
            "SELECT access_token, refresh_token, expires_at FROM google_tokens ORDER BY updated_at DESC LIMIT 1"
        )
        .fetch_optional(&state.pool)
        .await
        .unwrap();

        if let Some(row) = token_row {
            let client = reqwest::Client::new();
            
            let mut event_body = serde_json::json!({
                "summary": payload.event_name,
                "description": payload.notes.clone().unwrap_or_default(),
                "start": {
                    "dateTime": payload.start_time.to_rfc3339()
                },
                "end": {
                    "dateTime": payload.end_time.to_rfc3339()
                }
            });

            if payload.generate_meet_link {
                let req_id = format!("req_{}", chrono::Utc::now().timestamp_micros());
                event_body["conferenceData"] = serde_json::json!({
                    "createRequest": {
                        "requestId": req_id,
                        "conferenceSolutionKey": {
                            "type": "hangoutsMeet"
                        }
                    }
                });
            }

            let url = if payload.generate_meet_link {
                "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1"
            } else {
                "https://www.googleapis.com/calendar/v3/calendars/primary/events"
            };

            let res = client.post(url)
                .bearer_auth(row.access_token)
                .json(&event_body)
                .send()
                .await;
                
            if let Ok(response) = res {
                if let Ok(google_data) = response.json::<serde_json::Value>().await {
                    if let Some(hangout_link) = google_data["hangoutLink"].as_str() {
                        if let Ok(updated_event) = sqlx::query_as::<_, Event>("UPDATE events SET location = $1 WHERE id = $2 RETURNING *").bind(hangout_link).bind(event.id).fetch_one(&state.pool).await {
                           event = updated_event;
                        }
                    }
                }
            }
        }
    }
    Json(event)
}
async fn update_event(State(state): State<AppState>, Path(id): Path<i32>, Json(payload): Json<CreateEvent>) -> Json<Event> {
    let event = sqlx::query_as::<_, Event>("UPDATE events SET event_name = $1, start_time = $2, end_time = $3, category = $4, notes = $5 WHERE id = $6 RETURNING *").bind(payload.event_name).bind(payload.start_time).bind(payload.end_time).bind(payload.category).bind(payload.notes).bind(id).fetch_one(&state.pool).await.unwrap();
    Json(event)
}
async fn delete_event(State(state): State<AppState>, Path(id): Path<i32>) -> &'static str {
    sqlx::query("DELETE FROM events WHERE id = $1").bind(id).execute(&state.pool).await.unwrap();
    "Deleted"
}
async fn upsert_diary(State(state): State<AppState>, Json(payload): Json<CreateDiary>) -> Json<DiaryEntry> {
    let entry = sqlx::query_as::<_, DiaryEntry>("INSERT INTO diary_entries (entry_date, content, mood_rating) VALUES ($1, $2, $3) ON CONFLICT (entry_date) DO UPDATE SET content = EXCLUDED.content, mood_rating = EXCLUDED.mood_rating, updated_at = NOW() RETURNING *").bind(payload.entry_date).bind(payload.content).bind(payload.mood_rating).fetch_one(&state.pool).await.unwrap();
    Json(entry)
}
async fn get_daily_summary(State(state): State<AppState>, Path(date): Path<NaiveDate>) -> Json<DailySummary> {
    let tasks = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE target_date = $1").bind(date).fetch_all(&state.pool).await.unwrap();
    let mut events = sqlx::query_as::<_, Event>("SELECT * FROM events WHERE start_time::date = $1").bind(date).fetch_all(&state.pool).await.unwrap();
    let diary = sqlx::query_as::<_, DiaryEntry>("SELECT * FROM diary_entries WHERE entry_date = $1").bind(date).fetch_optional(&state.pool).await.unwrap();
    let google_events = fetch_google_events(&state.pool, date).await;
    events.extend(google_events);
    events.sort_by_key(|e| e.start_time);
    let is_google_connected = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM google_tokens").fetch_one(&state.pool).await.unwrap_or(0) > 0;
    Json(DailySummary { tasks, events, diary, is_google_connected })
}
async fn get_month_view(State(state): State<AppState>, Path((year, month)): Path<(i32, u32)>) -> Json<MonthSummary> {
    let start_date = NaiveDate::from_ymd_opt(year, month, 1).unwrap();
    let end_date = if month == 12 { NaiveDate::from_ymd_opt(year + 1, 1, 1) } else { NaiveDate::from_ymd_opt(year, month + 1, 1) }.unwrap();
    let days = sqlx::query_as::<_, DayData>(r#"SELECT d.date as target_date, COUNT(DISTINCT t.id) as task_count, COUNT(DISTINCT e.id) as event_count, EXISTS(SELECT 1 FROM diary_entries WHERE entry_date = d.date) as has_diary, (SELECT mood_rating FROM diary_entries WHERE entry_date = d.date) as mood_rating FROM (SELECT generate_series($1::date, $2::date - interval '1 day', interval '1 day')::date as date) d LEFT JOIN tasks t ON t.target_date = d.date LEFT JOIN events e ON e.start_time::date = d.date GROUP BY d.date ORDER BY d.date"#).bind(start_date).bind(end_date).fetch_all(&state.pool).await.unwrap();
    Json(MonthSummary { days })
}
#[derive(Serialize)]
struct Stats { pending_tasks: i64, completed_tasks: i64, events_today: i64, todays_mood: Option<i32> }
#[derive(Serialize, Deserialize, sqlx::FromRow)]
struct Habit { id: i32, name: String, icon: String, description: Option<String>, days_of_week: Vec<i32>, is_active: bool }
#[derive(Serialize, Deserialize)]
struct CreateHabit { name: String, icon: String, description: Option<String>, days_of_week: Vec<i32> }
#[derive(Serialize, Deserialize, sqlx::FromRow)]
struct HabitLog { id: i32, habit_id: i32, log_date: NaiveDate }
async fn get_habits(State(state): State<AppState>) -> Json<Vec<Habit>> {
    let habits = sqlx::query_as::<_, Habit>("SELECT * FROM habits").fetch_all(&state.pool).await.unwrap();
    Json(habits)
}
async fn create_habit(State(state): State<AppState>, Json(payload): Json<CreateHabit>) -> Json<Habit> {
    let habit = sqlx::query_as::<_, Habit>("INSERT INTO habits (name, icon, description, days_of_week) VALUES ($1, $2, $3, $4) RETURNING *").bind(payload.name).bind(payload.icon).bind(payload.description).bind(payload.days_of_week).fetch_one(&state.pool).await.unwrap();
    Json(habit)
}
async fn delete_habit(State(state): State<AppState>, Path(id): Path<i32>) -> &'static str {
    sqlx::query("DELETE FROM habits WHERE id = $1").bind(id).execute(&state.pool).await.unwrap();
    "Deleted"
}
async fn get_habit_logs(State(state): State<AppState>, Query(params): Query<serde_json::Value>) -> Json<Vec<HabitLog>> {
    let start_date = params["start"].as_str().and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()).unwrap_or_else(|| Utc::now().date_naive() - Duration::days(14));
    let end_date = params["end"].as_str().and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()).unwrap_or_else(|| Utc::now().date_naive());
    let logs = sqlx::query_as::<_, HabitLog>("SELECT * FROM habit_logs WHERE log_date >= $1 AND log_date <= $2").bind(start_date).bind(end_date).fetch_all(&state.pool).await.unwrap();
    Json(logs)
}

#[derive(sqlx::FromRow)]
struct IdRow { id: i32 }

async fn toggle_habit_log(State(state): State<AppState>, Json(payload): Json<HabitLog>) -> Json<serde_json::Value> {
    let existing = sqlx::query_as::<_, IdRow>("SELECT id FROM habit_logs WHERE habit_id = $1 AND log_date = $2").bind(payload.habit_id).bind(payload.log_date).fetch_optional(&state.pool).await.unwrap();
    if let Some(log) = existing { sqlx::query("DELETE FROM habit_logs WHERE id = $1").bind(log.id).execute(&state.pool).await.unwrap(); Json(serde_json::json!({"status": "removed"})) }
    else { sqlx::query("INSERT INTO habit_logs (habit_id, log_date) VALUES ($1, $2)").bind(payload.habit_id).bind(payload.log_date).execute(&state.pool).await.unwrap(); Json(serde_json::json!({"status": "added"})) }
}