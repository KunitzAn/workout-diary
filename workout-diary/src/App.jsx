import { Container } from 'react-bootstrap';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { workoutTypes } from './constants';

function App() {
  const addWorkout = async () => {
    try {
      const docRef = await addDoc(collection(db, "workouts"), {
        date: "2025-06-26",
        type: "ягодицы+плечи",
        exercises: [
          {
            name: "Приседания",
            weight: 50,
            sets: 4,
            reps: 10
          },
          {
            name: "Жим стоя",
            weight: 20,
            sets: 3,
            reps: 12
          }
        ],
        timestamp: new Date()
      });
      console.log("Тренировка добавлена с ID:", docRef.id);
    } catch (e) {
      console.error("Ошибка при записи:", e);
    }
  };

  const addSecondWorkout = async () => {
    try {
      const docRef = await addDoc(collection(db, "workouts"), {
        date: "2025-06-25", // Предыдущий день
        type: "спина",
        exercises: [
          {
            name: "Подтягивания",
            weight: 0, // Без веса
            sets: 3,
            reps: 8
          }
        ],
        timestamp: new Date()
      });
      console.log("Вторая тренировка добавлена с ID:", docRef.id);
    } catch (e) {
      console.error("Ошибка при записи:", e);
    }
  };

  return (
    <Container>
      <h1>Workout Diary</h1>
      <p>Приложение-дневник тренировок (Firebase подключён)</p>
      <button onClick={addWorkout} className="btn btn-primary mt-2">
        Добавить тестовую тренировку
      </button>
      <button onClick={addSecondWorkout} className="btn btn-secondary mt-2 ms-2">
        Добавить вторую тренировку
      </button>
    </Container>
  );
}

export default App;