const mysql = require("mysql2/promise");

// .env 파일을 사용하여 환경 변수로 관리하는 것이 더 안전합니다.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "0904", // 여기에 실제 MySQL 비밀번호를 입력하세요.
  database: process.env.DB_NAME || "ufc_insight",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 데이터베이스 연결을 테스트하고, 문제가 있을 경우 더 명확한 에러 메시지를 제공합니다.
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("Successfully connected to the database 'ufc_insight'.");
    connection.release();
  } catch (error) {
    console.error("[DATABASE ERROR] Failed to connect to the database.");
    if (error.code === "ER_BAD_DB_ERROR") {
      console.error("Database 'ufc_insight' does not exist.");
      console.error(
        "Please create it by running: CREATE DATABASE ufc_insight;"
      );
    } else {
      console.error(error);
    }
  }
})();

module.exports = pool;
