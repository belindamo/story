import './style.css';
import './review.css'
import $ from 'jquery';

window.addEventListener('load', () => {
document.addEventListener('keydown', (event) => {
  if (event.key === ' ') {
    $('#card-separator').removeClass('hidden');
    $('#card-back').removeClass('hidden');
  }
});
});
