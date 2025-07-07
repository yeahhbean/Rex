const ctx = document.getElementById('myChart');
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Food', 'Transport'],
    datasets: [{
      label: 'Spending',
      data: [25, 10],
      backgroundColor: ['#00d1b2', '#ffdd57']
    }]
  }
});