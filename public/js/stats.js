document.addEventListener("DOMContentLoaded", () => {
  const ctx2 = document.getElementById("categoryChart").getContext("2d");
  new Chart(ctx2, {
    type: "doughnut",
    data: {
      labels: window.categoryLabels || [],
      datasets: [
        {
          data: window.categoryData || [],
          backgroundColor: [
            "#1effb2",
            "#ff6b6b",
            "#51c2d5",
            "#ffc107",
            "#9c27b0",
            "#607d8b",
            "#e91e63",
          ],
          radius: "100%",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "50%",
      layout: {
        padding: 0,
      },
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });
});

const weeklyCtx = document
  .getElementById("weeklyInsightChart")
  .getContext("2d");
new Chart(weeklyCtx, {
  type: "bar",
  data: {
    labels: window.weeklyLabels,
    datasets: [
      {
        label: "전체 지출",
        data: window.totalWeeklyData,
        backgroundColor: "rgba(75, 192, 192, 0.7)",
      },
      {
        label: "감정적 지출",
        data: window.emotionalWeeklyData,
        backgroundColor: "rgba(255, 99, 132, 0.7)",
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "이번 주 요일별 지출 비교",
      },
      legend: {
        position: "bottom", // ⬅️ 여기에 들어가야 함!
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  },
});
