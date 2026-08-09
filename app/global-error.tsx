"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          background: "#11110f",
          color: "#f5f4ef",
          fontFamily: "system-ui, sans-serif",
          margin: 0,
        }}
      >
        <main
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: "100vh",
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ color: "#aaa69b", fontSize: 13 }}>DevRusher</p>
          <h1 style={{ fontSize: 26, margin: "8px 0 12px" }}>应用加载失败</h1>
          <p style={{ color: "#aaa69b", lineHeight: 1.7, maxWidth: 440 }}>
            你的本地学习数据不会因此被清除。请重新加载应用后继续。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#ff6b35",
              border: 0,
              borderRadius: 8,
              color: "#17120f",
              cursor: "pointer",
              fontWeight: 700,
              marginTop: 20,
              padding: "11px 18px",
            }}
          >
            重新加载
          </button>
        </main>
      </body>
    </html>
  );
}
