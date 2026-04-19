use axum::{
    routing::{get, post, put, delete},
    extract::{State, Json, Path},
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use dotenvy::dotenv;
use std::env;
use chrono::{NaiveDate, DateTime, Utc};
use tower_http::cors::CorsLayer;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
struct DiaryEntry {
    id: i32,
    entry_date: NaiveDate,
    content: String,
    mood_rating: Option<i32>,
}

#[derive(Serialize, Deserialize, sqlx::FromRow)]
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
}

#[derive(Serialize, Deserialize)]
struct CreateDiary {
    entry_date: NaiveDate,
    content: String,
    mood_rating: Option<i32>,
}

#[derive(Serialize, Deserialize, sqlx::FromRow)]
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
}

#[derive(Serialize)]
struct DailySummary {
    tasks: Vec<Task>,
    events: Vec<Event>,
    diary: Option<DiaryEntry>,
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    let database_url = env::var("DATABASE_URL_UNPOOLED").expect("DATABASE_URL must be set");

    let pool = PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to Neon");

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
        .layer(cors)
        .with_state(pool);

    let port = env::var("PORT").unwrap_or_else(|_| "5059".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    println!("Backend running on http://{}", addr);
    axum::serve(listener, app).await.unwrap();
}

#[derive(Serialize)]
struct Stats {
    pending_tasks: i64,
    completed_tasks: i64,
    events_today: i64,
    todays_mood: Option<i32>,
}

async fn get_stats(State(pool): State<PgPool>) -> Json<Stats> {
    let today = Utc::now().date_naive();

    let pending_tasks = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM tasks WHERE is_completed = false")
        .fetch_one(&pool).await.unwrap();

    let completed_tasks = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM tasks WHERE is_completed = true")
        .fetch_one(&pool).await.unwrap();

    let events_today = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM events WHERE start_time::date = $1")
        .bind(today).fetch_one(&pool).await.unwrap();

    let todays_mood = sqlx::query_scalar::<_, Option<i32>>("SELECT mood_rating FROM diary_entries WHERE entry_date = $1")
        .bind(today).fetch_one(&pool).await.unwrap();

    Json(Stats {
        pending_tasks,
        completed_tasks,
        events_today,
        todays_mood,
    })
}

// --- Tasks ---

async fn get_tasks(State(pool): State<PgPool>) -> Json<Vec<Task>> {
    let tasks = sqlx::query_as::<_, Task>("SELECT id, title, is_completed, target_date FROM tasks ORDER BY target_date ASC")
        .fetch_all(&pool).await.unwrap();
    Json(tasks)
}

async fn create_task(State(pool): State<PgPool>, Json(payload): Json<CreateTask>) -> Json<Task> {
    let target_date = payload.target_date.unwrap_or_else(|| Utc::now().date_naive());
    let task = sqlx::query_as::<_, Task>(
        "INSERT INTO tasks (title, target_date) VALUES ($1, $2) RETURNING id, title, is_completed, target_date"
    )
    .bind(payload.title)
    .bind(target_date)
    .fetch_one(&pool).await.unwrap();
    Json(task)
}

async fn update_task(State(pool): State<PgPool>, Path(id): Path<i32>, Json(payload): Json<Task>) -> Json<Task> {
    let task = sqlx::query_as::<_, Task>(
        "UPDATE tasks SET title = $1, is_completed = $2, target_date = $3 WHERE id = $4 RETURNING id, title, is_completed, target_date"
    )
    .bind(payload.title)
    .bind(payload.is_completed)
    .bind(payload.target_date)
    .bind(id)
    .fetch_one(&pool).await.unwrap();
    Json(task)
}

async fn delete_task(State(pool): State<PgPool>, Path(id): Path<i32>) -> &'static str {
    sqlx::query("DELETE FROM tasks WHERE id = $1").bind(id).execute(&pool).await.unwrap();
    "Deleted"
}

// --- Events ---

async fn get_events(State(pool): State<PgPool>) -> Json<Vec<Event>> {
    let events = sqlx::query_as::<_, Event>("SELECT * FROM events ORDER BY start_time ASC")
        .fetch_all(&pool).await.unwrap();
    Json(events)
}

async fn create_event(State(pool): State<PgPool>, Json(payload): Json<CreateEvent>) -> Json<Event> {
    let event = sqlx::query_as::<_, Event>(
        "INSERT INTO events (event_name, start_time, end_time, category, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *"
    )
    .bind(payload.event_name)
    .bind(payload.start_time)
    .bind(payload.end_time)
    .bind(payload.category)
    .bind(payload.notes)
    .fetch_one(&pool).await.unwrap();
    Json(event)
}

async fn update_event(State(pool): State<PgPool>, Path(id): Path<i32>, Json(payload): Json<CreateEvent>) -> Json<Event> {
    let event = sqlx::query_as::<_, Event>(
        "UPDATE events SET event_name = $1, start_time = $2, end_time = $3, category = $4, notes = $5 WHERE id = $6 RETURNING *"
    )
    .bind(payload.event_name)
    .bind(payload.start_time)
    .bind(payload.end_time)
    .bind(payload.category)
    .bind(payload.notes)
    .bind(id)
    .fetch_one(&pool).await.unwrap();
    Json(event)
}

async fn delete_event(State(pool): State<PgPool>, Path(id): Path<i32>) -> &'static str {
    sqlx::query("DELETE FROM events WHERE id = $1").bind(id).execute(&pool).await.unwrap();
    "Deleted"
}

// --- Diary ---

async fn upsert_diary(State(pool): State<PgPool>, Json(payload): Json<CreateDiary>) -> Json<DiaryEntry> {
    let entry = sqlx::query_as::<_, DiaryEntry>(
        r#"
        INSERT INTO diary_entries (entry_date, content, mood_rating)
        VALUES ($1, $2, $3)
        ON CONFLICT (entry_date) 
        DO UPDATE SET content = EXCLUDED.content, mood_rating = EXCLUDED.mood_rating, updated_at = NOW()
        RETURNING id, entry_date, content, mood_rating
        "#
    )
    .bind(payload.entry_date)
    .bind(payload.content)
    .bind(payload.mood_rating)
    .fetch_one(&pool).await.unwrap();
    Json(entry)
}

// --- Summaries ---

async fn get_daily_summary(State(pool): State<PgPool>, Path(date): Path<NaiveDate>) -> Json<DailySummary> {
    let tasks = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE target_date = $1")
        .bind(date).fetch_all(&pool).await.unwrap();

    let events = sqlx::query_as::<_, Event>(
        "SELECT * FROM events WHERE start_time::date = $1 OR end_time::date = $1"
    )
    .bind(date).fetch_all(&pool).await.unwrap();

    let diary = sqlx::query_as::<_, DiaryEntry>("SELECT * FROM diary_entries WHERE entry_date = $1")
        .bind(date).fetch_optional(&pool).await.unwrap();

    Json(DailySummary { tasks, events, diary })
}

async fn get_month_view(State(pool): State<PgPool>, Path((year, month)): Path<(i32, u32)>) -> Json<MonthSummary> {
    let start_date = NaiveDate::from_ymd_opt(year, month, 1).unwrap();
    let end_date = if month == 12 {
        NaiveDate::from_ymd_opt(year + 1, 1, 1)
    } else {
        NaiveDate::from_ymd_opt(year, month + 1, 1)
    }.unwrap();

    let days = sqlx::query_as::<_, DayData>(
        r#"
        SELECT 
            d.date as target_date,
            COUNT(DISTINCT t.id) as task_count,
            COUNT(DISTINCT e.id) as event_count,
            EXISTS(SELECT 1 FROM diary_entries WHERE entry_date = d.date) as has_diary
        FROM (
            SELECT generate_series($1::date, $2::date - interval '1 day', interval '1 day')::date as date
        ) d
        LEFT JOIN tasks t ON t.target_date = d.date
        LEFT JOIN events e ON e.start_time::date = d.date
        GROUP BY d.date
        ORDER BY d.date
        "#
    )
    .bind(start_date)
    .bind(end_date)
    .fetch_all(&pool).await.unwrap();

    Json(MonthSummary { days })
}