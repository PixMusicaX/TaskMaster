use axum::{
    routing::{get, post},
    extract::{State, Json},
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use dotenvy::dotenv;
use std::env;

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

#[tokio::main]
async fn main() {
    dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    // 1. Create the connection pool
    let pool = PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to Neon");

    // 2. Build our app with routes and shared state
    let app = Router::new()
        .route("/tasks", post(create_task))
        .route("/tasks", get(get_tasks))
        .with_state(pool);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Backend running on http://localhost:3000");
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