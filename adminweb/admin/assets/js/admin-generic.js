function loadCount () {
  $.getJSON('/match/count', function (data) {
    console.log(data.count, 'guests')
    $('.guest-count').html(data.count)
  })
}

$(document).ready(function () {
  // Bind guest count
  if ($('.guest-count').length > 0) {
    loadCount()
    setInterval(loadCount, 5000)
  }
})
