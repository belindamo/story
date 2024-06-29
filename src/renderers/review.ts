import '../styles/index.css';
import '../styles/review.css';
import $ from 'jquery';
import { schedule, ReviewResponse, textInterval } from '../lib/scheduler';
import { DEFAULT_SETTINGS } from '../lib/settings';

window.addEventListener('load', async () => {
  document.addEventListener('keydown', (event) => {
    if (event.key === ' ') {
      $('#card-separator').removeClass('hidden');
      $('#card-back').removeClass('hidden');
    }
  });

  let currentCardIndex = 0;

  // @ts-ignore
  let cards = await window.api.sync();  

  function showCard() {
    let currentCard = cards[currentCardIndex];
    $('#card-front').text(currentCard.front);
    $('#card-back').text(currentCard.back);
    $('#card-separator').addClass('hidden');
    $('#card-back').addClass('hidden');
  }

  function updateIntervalDisplay(interval: number) {
    $('#response div p').each((i, el) => {
      $(el).text(textInterval(interval));
    });
  }

  function processReview(response: ReviewResponse) {
    let currentCard = cards[currentCardIndex];
    let result = schedule(response, currentCard.interval, currentCard.ease, 0, DEFAULT_SETTINGS);
    console.log('review', result.interval, result.ease)
    currentCard.interval = result.interval;
    currentCard.ease = result.ease;
    
    currentCardIndex = (currentCardIndex + 1) % cards.length;
     // updateIntervalDisplay(currentCard.interval);
  }

  $('#again').on('click', () => {
    processReview(ReviewResponse.Again);
  });

  $('#hard').on('click', () => {
    processReview(ReviewResponse.Hard);
  });

  $('#good').on('click', () => {
    processReview(ReviewResponse.Good);
  });

  $('#easy').on('click', () => {
    processReview(ReviewResponse.Easy);
  });

  document.addEventListener('keydown', (event) => {
    switch(event.key) {
      case 'd':
        processReview(ReviewResponse.Again);
        break;
      case 'f':
        processReview(ReviewResponse.Hard);
        break;
      case 'j':
        processReview(ReviewResponse.Good);
        break;
      case 'k':
        processReview(ReviewResponse.Easy);
        break;
    }
  });

  showCard();
  updateIntervalDisplay(cards[currentCardIndex].interval);
});
