import { Container, Button, ListGroup, Form, Row, Col } from 'react-bootstrap';
import Calendar from 'react-calendar';
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { workoutTypes } from './constants';

function App() {
  const [workouts, setWorkouts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [newExercise, setNewExercise] = useState({ name: '', weight: '', sets: '', reps: '' });
  const [selectedType, setSelectedType] = useState("ягодицы+плечи"); // Новое состояние для типа

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

  // Отметка дней с тренировками
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
    setSelectedWorkout(workout || null);
    if (workout) setSelectedType(workout.type); // Устанавливаем текущий тип для существующей тренировки
  };

  // Добавление нового упражнения
  const addExercise = async (e) => {
    e.preventDefault();
    const exerciseData = {
      name: newExercise.name,
      weight: parseFloat(newExercise.weight) || 0,
      sets: parseInt(newExercise.sets) || 0,
      reps: parseInt(newExercise.reps) || 0
    };

    if (!selectedWorkout) {
      // Создаём новую тренировку, если её нет
      const docRef = await addDoc(collection(db, "workouts"), {
        date: selectedDate.toISOString().split('T')[0],
        type: selectedType, // Используем выбранный тип
        exercises: [exerciseData],
        timestamp: new Date()
      });
      setWorkouts([...workouts, { id: docRef.id, date: selectedDate.toISOString().split('T')[0], type: selectedType, exercises: [exerciseData], timestamp: new Date() }]);
      setSelectedWorkout({ id: docRef.id, date: selectedDate.toISOString().split('T')[0], type: selectedType, exercises: [exerciseData], timestamp: new Date() });
    } else {
      // Обновляем существующую тренировку
      const updatedExercises = [...selectedWorkout.exercises, exerciseData];
      const workoutDocRef = doc(db, "workouts", selectedWorkout.id);
      await updateDoc(workoutDocRef, { exercises: updatedExercises, timestamp: new Date() });
      setWorkouts(workouts.map(w => w.id === selectedWorkout.id ? { ...w, exercises: updatedExercises } : w));
      setSelectedWorkout({ ...selectedWorkout, exercises: updatedExercises });
    }
    setNewExercise({ name: '', weight: '', sets: '', reps: '' });
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

      {selectedWorkout && (
        <div className="mt-4">
          <h3>Упражнения для {selectedDate.toLocaleDateString()}</h3>
          <ListGroup>
            {selectedWorkout.exercises.map((exercise, index) => (
              <ListGroup.Item key={index}>
                {exercise.name}: {exercise.weight} кг, {exercise.sets} x {exercise.reps}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </div>
      )}

      <div className="mt-4">
        <h3>Добавить упражнение</h3>
        <Form onSubmit={addExercise}>
          <Row>
            <Col md={3}>
              <Form.Group controlId="formType">
                <Form.Label>Тип тренировки</Form.Label>
                <Form.Select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  required
                >
                  {Object.keys(workoutTypes).map((type) => (
                    <option key={type} value={type}>
                      {type} {workoutTypes[type].icon}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group controlId="formName">
                <Form.Label>Название</Form.Label>
                <Form.Control
                  type="text"
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group controlId="formWeight">
                <Form.Label>Вес (кг)</Form.Label>
                <Form.Control
                  type="number"
                  value={newExercise.weight}
                  onChange={(e) => setNewExercise({ ...newExercise, weight: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group controlId="formSets">
                <Form.Label>Подходы</Form.Label>
                <Form.Control
                  type="number"
                  value={newExercise.sets}
                  onChange={(e) => setNewExercise({ ...newExercise, sets: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group controlId="formReps">
                <Form.Label>Повторения</Form.Label>
                <Form.Control
                  type="number"
                  value={newExercise.reps}
                  onChange={(e) => setNewExercise({ ...newExercise, reps: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={1} className="d-flex align-items-end">
              <Button variant="primary" type="submit">
                Добавить
              </Button>
            </Col>
          </Row>
        </Form>
      </div>
    </Container>
  );
}

export default App;