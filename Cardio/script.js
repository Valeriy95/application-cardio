'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputTemp = document.querySelector('.form__input--temp');
const inputClimb = document.querySelector('.form__input--climb');
const btnReset = document.querySelector('.btn__reset');

class Workout {

    date = new Date();
    id = Date.now().toString().slice(-10);

    constructor(coords, distance, duration) {
        this.coords = coords,
        this.distance = distance,
        this.duration = duration
    }

    _setDescription() {
        this.type === "running" ? this.description = `Пробежка ${new Intl.DateTimeFormat('ru-RU').format(this.date)}` : this.description = `Велотренировка ${new Intl.DateTimeFormat('ru-RU').format(this.date)}`;
    }
}

class Running extends Workout {

    type = 'running';

    constructor(coords, distance, duration, temp) {
        super(coords, distance, duration);
        this.temp = temp;
        this.calculatePace();
        this._setDescription();
    }

    calculatePace() {
        this.pace = this.duration / this.distance;
    }
}

class Cycling extends Workout {

    type = 'cycling';

    constructor(coords, distance, duration, climb) {
        super(coords, distance, duration);
        this.climb = climb;
        this.calculateSpeed();
        this._setDescription();
    }

    calculateSpeed() {
        this.speed = this.distance / this.duration / 60;
    }
}

class App {

    #map;
    #mapEvent;
    #workouts = [];

    constructor() {
        this._getPosition();
        this._getLocalStorageData();
        form.addEventListener('submit', this._newWorkout.bind(this));  
        inputType.addEventListener('change', this._toggleClimbField);
        containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this));
        btnReset.addEventListener('click', this._reset);
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this),
                function () {
                    alert('Невозможно получить геолокацию')
                }
            )
        }
    }

    _loadMap(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        this.#map = L.map('map').setView([latitude, longitude], 13);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(workout => {
            this._displayWorkout(workout);
        })
    }

    _showForm(e) {
        this.#mapEvent = e;
        form.classList.remove('hidden');
        inputDistance.focus();

    }

    _hideForm() {
        inputDistance.value = 
        inputDuration.value = 
        inputTemp.value = 
        inputClimb.value = '';
        form.classList.add('hidden');
    }

    _toggleClimbField() {
        inputClimb.closest('.form__row').classList.toggle('form__row--hidden');
        inputTemp.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        e.preventDefault();
        let workout;
        // Получить данные из формы
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;

        // Если тренировка является пробежкой отобразить обьект Running
        if(type === 'running') {
            // Проверка валидности данных 
            const temp = +inputTemp.value;

            if(
                !Number.isFinite(distance) ||
                !(distance > 0) ||
                !Number.isFinite(duration) ||
                !(duration > 0) || 
                !Number.isFinite(temp) || 
                !(temp > 0)
            ) {
                return alert('Введите положительное число!')
            }           
            workout = new Running([this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng], distance, duration, temp);
        }

        // Если тренировка является велотренировкой отобразить обьект Cycling
        if(type === 'cycling') {
            // Проверка валидности данных 
            const climb = +inputClimb.value;
            if(
                !Number.isFinite(distance) ||
                !(distance > 0) || 
                !Number.isFinite(duration) ||
                !(duration > 0) || 
                !Number.isFinite(climb)
            ) {
                return alert('Введите положительное число!')
            }
            workout = new Cycling([this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng], distance, duration, climb);
        }

        // Добавить новый объект в массив тренировок
        this.#workouts.push(workout);

        // Отобразить тренировку на карте
        this._displayWorkout(workout);

        // Отобразить тренировку в списке
        this._displayWorkoutOnSidebar(workout);

        // Спрятать форму и очистить поля ввода данных 
        this._hideForm();

        // Добавить все тренировки в локальное хранилище
        this._addWorkoutToLocalStorage();
    
    }

    _displayWorkout(workout) {
        L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(L.popup({
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup` 
        }))
        .setPopupContent(`${workout.type === "running" ? "🏃" : "🚵‍♂️"} ${workout.description}`)
        .openPopup();
    }

    _displayWorkoutOnSidebar(workout) {

        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === "running" ? "🏃" : "🚵‍♂️"}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">км</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">мин</span>
          </div>
        `

        if(workout.type === 'running') {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">📏</span>
                    <span class="workout__value">${workout.pace.toFixed(2)}</span>
                    <span class="workout__unit">мин/км</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">👟</span>
                    <span class="workout__value">${workout.temp}</span>
                    <span class="workout__unit">шаг/мин</span>
                </div>
            </li>
            `
        }

        if(workout.type === 'cycling') { 
            html += `
                <div class="workout__details">
                    <span class="workout__icon">📏</span>
                    <span class="workout__value">${workout.speed.toFixed(2)}</span>
                    <span class="workout__unit">км/ч</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🏔</span>
                    <span class="workout__value">${workout.climb}</span>
                    <span class="workout__unit">м</span>
                </div>
            </li>
            `
        }

    form.insertAdjacentHTML('afterend', html);
    }

    _moveToWorkout(e) {
        const workoutElement = e.target.closest('.workout');
        if(!workoutElement) return;
        const workout = this.#workouts.find(item => item.id === workoutElement.dataset.id)
        this.#map.setView(workout.coords, 13, {
            animate: true,
            pan: {
                duration: 1,
            }
        });
    }

    _addWorkoutToLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorageData() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        if(!data) return;
        this.#workouts = data;
        this.#workouts.forEach(workout => {
            this._displayWorkoutOnSidebar(workout);
        })
    }

    _reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}

const app = new App();
