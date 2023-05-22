'use strict';

class Workout {
  date = new Date();
  createdAt = Date.now();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // Instance Running on April 14
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()] // this.date.toLocaleString('default', {month: 'long'})
    } ${this.date.getDate()}`;
  }

  _clicks() {
    this.clicks++;
    console.log(this.clicks);
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    // this.type = 'cycling'
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
  }
}
// // testiranje da li rade klase tako sto se rucno prave objekti
// const run1 = new Running([23, 59], 25, 30, 200);
// const clc1 = new Cycling([41, 12], 55, 74, 444);

// console.log(run1, clc1);

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const sortBtn = document.querySelector('.btn--sort');
const deleteAll = document.querySelector('.delete__all');
const inputId = document.querySelector('.form__input--id'); ////
const containerSortButtons = document.querySelector(
  '.sort__buttons__container'
);

class App {
  #markers = [];
  #workouts = [];
  #mapEvent;
  #map;
  #addingNew;
  #editWorkout;
  sorted = false;

  constructor() {
    this._getPosition();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._handleClick.bind(this));
    this._getLocaleStorage();
    deleteAll.addEventListener('click', this._deleteAll.bind(this));
    containerSortButtons.addEventListener('click', this._sortList.bind(this));
  }

  _getPosition() {
    // Get current location, pass 2 functions, first for load, second for false
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Nije moguce pronaci trenutnu lokaciju');
      }
    );
  }

  _loadMap(position) {
    // Set current location view on map
    const latitude = position.coords.latitude; // const {latitude} = position.coords
    const longitude = position.coords.longitude;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.fr/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Show form when click on map
    this.#map.on('click', this._showForm.bind(this));

    // After map is loaded render workout markers
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    // map.on ima svoj event koji u ovom slucaju sadrzi koordinate
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setInterval(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _handleClick(e) {
    if (e.target.classList.contains('delete')) {
      this._deleteWorkout(e);
    } else if (e.target.classList.contains('sort')) {
      containerSortButtons.classList.toggle('zero__height');
    } else if (e.target.classList.contains('edit')) {
      this._showEditForm(e);
    } else {
      this._moveToMarker(e);
    }
  }

  _newWorkout(e) {
    e.preventDefault();
    // Functions for checking inputs
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Set values for new workout(or edited)
    const id = inputId.value;
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // If id === 0 add new
    this.#addingNew = id === '0';
    // Set position on map where is clicked
    const { lat, lng } = this.#addingNew ? this.#mapEvent.latlng : {};
    // creating let workout beacause there are 2 types
    let workout;

    // Seting new workout based on type
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Input number has to be positive!');

      // If adding new true create workout
      if (this.#addingNew)
        workout = new Running([lat, lng], distance, duration, cadence);
      // if adding new false find edited workout and set new inputs, method, delete marker
      if (!this.#addingNew) {
        const workoutEl = this.#editWorkout.target.closest('.workout');
        workout = this._findWorkout(workoutEl.dataset.id);
        workout.distance = distance;
        workout.duration = duration;
        workout.cadence = cadence;
        workout.calcPace();
        this._deleteMarker(workout.id);
      }
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Input number has to be positive!');

      if (this.#addingNew)
        workout = new Cycling([lat, lng], distance, duration, elevation);
      if (!this.#addingNew) {
        const workoutEl = this.#editWorkout.target.closest('.workout');
        workout = this._findWorkout(workoutEl.dataset.id);
        workout.distance = distance;
        workout.duration = duration;
        workout.elevation = elevation;
        workout.calcSpeed();
        this._deleteMarker(workout.id);
      }
    }
    // If true add new, if false nothing
    if (this.#addingNew) this.#workouts.push(workout);

    this._renderWorkoutMarker(workout);

    this._renderWorkout(workout);

    this._hideForm();

    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    // Render marker with workout coords on map and popups...
    let marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          minWidth: 100,
          maxWidth: 250,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'}${workout.description}`
      )
      .openPopup();

    marker._id = workout.id;
    this.#markers.push(marker);
  }

  _renderWorkout(workout) {
    // Render workout on sidebar list
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <div class ='buttons-ed'>
          <button class = 'edit'> ✏️</button>
          <button class ='delete'>❌</button>
        </div>
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;
    // Apply if running
    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;
    }
    // Apply if cycling
    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevation}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>`;
    }
    // If adding new workout add on form after end
    if (this.#addingNew) form.insertAdjacentHTML('afterend', html);
    // If not new workout get workout element and add html
    if (!this.#addingNew) {
      this.#editWorkout.target.closest('.workout').outerHTML = html;
    }
  }

  _moveToMarker(e) {
    // Get current workout element
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    // Get current workout
    const workout = this._findWorkout(workoutEl.dataset.id);

    // Set view of map to workout coords
    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    workout._clicks();
  }

  _showEditForm(e) {
    // Current workout element
    const workoutEl = e.target.closest('.workout');

    // Find current workout with id
    const curWorkout = this._findWorkout(workoutEl.dataset.id);

    // Save to field to approach target of listener for rendering edited workout
    this.#editWorkout = e;

    // Check if user change workout type
    if (inputType.value !== curWorkout.type) {
      this._toggleElevationField;
    }

    if (this.#workouts.find(workout => workout === curWorkout))
      this.#addingNew = false;

    // Populate form inputs with current values
    inputId.value = curWorkout.id;
    inputType.value = curWorkout.type;
    inputDistance.value = curWorkout.distance;
    inputDuration.value = curWorkout.duration;

    if (curWorkout.type === 'running') inputCadence.value = curWorkout.cadence;
    if (curWorkout.type === 'cycling')
      inputElevation.value = curWorkout.elevation;

    this._showForm();
  }

  // _deleteById(id) {
  //   this.#workouts = this.#workouts.filter(work => work.id !== id);

  //   this._refreshCards();
  // }

  // _refreshCards() {
  //   this._setLocalStorage();
  //   containerWorkouts.querySelectorAll('.workout').forEach(w => w.remove());
  //   this._getLocaleStorage();
  // }

  _deleteWorkout(e) {
    // Confirm message
    if (!confirm('Are you sure?')) return;

    // Get workout element
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    // Get current workout
    const workout = this._findWorkout(workoutEl.dataset.id);
    const workoutPosition = this.#workouts.indexOf(workout);

    // Delete current workout
    this.#workouts.splice(workoutPosition, 1);

    // Delete current workout element from list
    workoutEl.outerHTML = '';

    // Delete marker from map
    this._deleteMarker(workout.id);

    // Save workouts
    this._setLocalStorage();
  }

  _deleteMarker(id) {
    // Setting new empty array
    const newMarkers = [];

    // Loop current markers array
    this.#markers.forEach(
      function (marker) {
        // If marker id equal workout id remove layer
        if (marker._id === id) {
          this.#map.removeLayer(marker);
        } else {
          // Else push to new array
          newMarkers.push(marker);
        }
      }.bind(this)
    );
    // Set field array to new looped array
    this.#markers = newMarkers;
  }

  _findWorkout(id) {
    if (!id) return;
    return this.#workouts.find(work => work.id === id, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  _deleteAll() {
    // Removing all workouts from local storage
    if (confirm('Are you sure?')) {
      localStorage.removeItem('workouts');
      location.reload();
    }
  }

  _sortList(e) {
    // Get button
    const button = e.target.closest('.sort__button');
    if (!button) return;

    // Sort array
    switch (button.dataset.type) {
      case 'distance-dsc':
        this._checkingSort((a, b) => a.distance - b.distance);
        break;
      case 'distance-asc':
        this._checkingSort((a, b) => b.distance - a.distance);
        break;
      case 'duration-asc':
        this._checkingSort((a, b) => a.duration - b.duration);
        break;
      case 'duration-dsc':
        this._checkingSort((a, b) => b.duration - a.duration);
        break;
      case 'date-asc':
        this._checkingSort((a, b) => a.createdAt - b.createdAt);
        break;
    }

    // Clear list
    document.querySelectorAll('.workout').forEach(el => el.remove());

    // Render list
    this.#addingNew = true;
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }

  _checkingSort(condition) {
    this.sorted = !this.sorted;
    this.sorted
      ? this.#workouts.sort(condition)
      : this.#workouts.sort((a, b) => a.createdAt - b.createdAt);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocaleStorage() {
    // Convert back to object
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    // Setting back properties
    this.#workouts = data.map(workout => {
      let proto = {};
      if (workout.type === 'running') proto = Running.prototype;
      else if (workout.type === 'cycling') proto = Cycling.prototype;

      const newWorkout = Object.create(proto);
      return Object.assign(newWorkout, workout);
    });

    // Render workouts
    this.#addingNew = true;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
}

const app = new App();
