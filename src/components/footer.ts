const footer = `
<div id="go-home">
  <a href="index.html">home</a>
  ·
  <a target="_blank" href="https://buymeacoffee.com/belindamo">cafe</a>
  ·
  <a id="update-folder" href="#">update folder path</a>
  <!-- · -->
  <!-- <a href="convo.html">convo</a> -->
  <!-- · -->
  <!-- <a href="review.html">review</a> -->
  <!-- <a href="swipe.html">swipe</a> -->
  <!-- <a target="_blank" href="town.html">town</a> -->
</div>
`;

(function injectFooter() {
  const main = document.querySelector('main');
  if (main) {
    main.insertAdjacentHTML('beforeend', footer);
  }
}());

