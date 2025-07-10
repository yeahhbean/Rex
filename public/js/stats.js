document.addEventListener("DOMContentLoaded", () => {
  const ctx1 = document.getElementById("monthlyChart").getContext("2d");
  new Chart(ctx1, {
    type: "line",
    data: {
      labels: window.monthLabels || [],
      datasets: [
        {
          label: "Monthly Expense",
          data: window.monthData || [],
          borderColor: "#00ffe0",
          fill: false,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });

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
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });
});
