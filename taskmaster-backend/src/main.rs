use axum::{
    routing::{get, post},
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
}

#[derive(Serialize, Deserialize)]
struct CreateTask {
    title: String,
}

#[derive(Serialize, Deserialize, sqlx::FromRow)]
struct Task {
    id: i32,
    title: String,
    is_completed: bool,
}

#[derive(Serialize)]
struct MonthSummary {
    days: Vec<DayData>,
}

// Update your struct definition like this:
#[derive(serde::Serialize, sqlx::FromRow)] // Add sqlx::FromRow here!
struct DayData {
    target_date: chrono::NaiveDate,
    task_count: i64,
    has_diary: bool,
}

#[derive(Serialize)]
struct DailySummary {
    tasks: Vec<Task>,
    events: Vec<Event>,
    diary: Option<DiaryEntry>,
}

async fn get_daily_summary(
    State(pool): State<PgPool>,
    Path(date): Path<NaiveDate>, // Extracts date from URL: /day/2026-04-06
) -> Json<DailySummary> {

    let tasks = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE target_date = $1")
        .bind(date)
        .fetch_all(&pool).await.unwrap();

    let diary = sqlx::query_as::<_, DiaryEntry>("SELECT * FROM diary_entries WHERE entry_date = $1")
        .bind(date)
        .fetch_optional(&pool)
        .await
        .unwrap();

    // (Add event fetching logic here similarly)

    Json(DailySummary { tasks, events: vec![], diary })
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    let database_url = env::var("DATABASE_URL_UNPOOLED").expect("DATABASE_URL must be set");

    let pool = PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to Neon");

    let cors = CorsLayer::permissive(); // For development only!

    let app = Router::new()
        .route("/tasks", post(create_task))
        .route("/tasks", get(get_tasks))
        .route("/calendar/{year}/{month}", get(get_month_view))
        .route("/day/{date}", get(get_daily_summary))
        .layer(cors) // Add the CORS layer
        .with_state(pool);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:5059").await.unwrap();
    println!("Backend running on http://localhost:5059");
    axum::serve(listener, app).await.unwrap();
}

// POST /tasks - Create a new task
async fn create_task(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateTask>,
) -> Json<Task> {
    let task = sqlx::query_as::<_, Task>(
        "INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, is_completed"
    )
    .bind(payload.title)
    .fetch_one(&pool)
    .await
    .unwrap();

    Json(task)
}

// GET /tasks - Fetch all tasks
async fn get_tasks(State(pool): State<PgPool>) -> Json<Vec<Task>> {
    let tasks = sqlx::query_as::<_, Task>("SELECT id, title, is_completed FROM tasks")
        .fetch_all(&pool)
        .await
        .unwrap();

    Json(tasks)
}

async fn get_month_view(
    State(pool): State<PgPool>,
    Path((year, month)): Path<(i32, u32)>,
) -> Json<MonthSummary> {
    // Calculate start and end of month
    let start_date = NaiveDate::from_ymd_opt(year, month, 1).unwrap();
    let end_date = if month == 12 {
        NaiveDate::from_ymd_opt(year + 1, 1, 1)
    } else {
        NaiveDate::from_ymd_opt(year, month + 1, 1)
    }.unwrap();

    let day_summaries = sqlx::query_as::<sqlx::Postgres, DayData>(
        r#"
        SELECT 
            target_date, 
            COUNT(id) as task_count, 
            EXISTS(SELECT 1 FROM diary_entries WHERE entry_date = tasks.target_date) as has_diary
        FROM tasks
        WHERE target_date >= $1 AND target_date < $2
        GROUP BY target_date
        "#
    )
    .bind(start_date)
    .bind(end_date)
    .fetch_all(&pool)
    .await
    .unwrap();

    // Map to your struct...
    // (Simplified for brevity)
    Json(MonthSummary { days: vec![] }) 
}