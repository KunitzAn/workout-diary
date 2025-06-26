import { Container } from 'react-bootstrap';
import Calendar from 'react-calendar';
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import { workoutTypes } from './constants';

function App() {
  const [workouts, setWorkouts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Загрузка тренировок из Firestore
  useEffect(() => {
    const fetchWorkouts = async () => {
      const querySnapshot = await getDocs(collection(db, "workouts"));
      const workoutsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWorkouts(workoutsData);
    };
    fetchWorkouts();
  }, []);

  // Функция для отметки дней с тренировками
  const tileContent = ({ date }) => {
    const workout = workouts.find(w => w.date === date.toISOString().split('T')[0]);
    if (workout && workoutTypes[workout.type]) {
      return <span style={{ color: workoutTypes[workout.type].color }}>{workoutTypes[workout.type].icon}</span>;
    }
    return null;
  };

  // Обработчик клика по дню
  const onDateChange = (date) => {
    setSelectedDate(date);
    const workout = workouts.find(w => w.date === date.toISOString().split('T')[0]);
    if (workout) {
      console.log("Выбрана тренировка:", workout);
    } else {
      console.log("Тренировок в этот день нет");
    }
  };

  return (
    <Container>
      <h1>Workout Diary</h1>
      <p>Приложение-дневник тренировок (Firebase подключён)</p>
      <div className="mt-4">
        <Calendar
          onChange={onDateChange}
          value={selectedDate}
          tileContent={tileContent}
        />
      </div>
      <p className="mt-3">Выбрана дата: {selectedDate.toLocaleDateString()}</p>
    </Container>
  );
}

export default App;