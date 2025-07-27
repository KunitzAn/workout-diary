import { Container, Button, ListGroup, Form, Row, Col } from 'react-bootstrap';
import Calendar from 'react-calendar';
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { workoutTypes } from './constants.jsx';

function App() {
  const [workouts, setWorkouts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [newExercise, setNewExercise] = useState({ name: '', weight: '', sets: '', reps: '' });
  const [selectedType, setSelectedType] = useState("ягодицы+плечи");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkouts = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "workouts"));
        const workoutsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          date: doc.data().date.toDate ? doc.data().date.toDate().toISOString().split('T')[0] : doc.data().date,
          type: doc.data().type,
          exercises: doc.data().exercises,
          timestamp: doc.data().timestamp
        }));
        console.log("Fetched workouts data:", workoutsData);
        setWorkouts(workoutsData);
      } catch (error) {
        console.error("Error fetching workouts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkouts();
  }, []);

  const tileContent = ({ date }) => {
    if (loading || !workouts.length) return null;
    const dateStr = date.toISOString().split('T')[0];
    const workout = workouts.find(w => w.date === dateStr);
    console.log("Tile date:", dateStr, "Workouts checked:", workouts.map(w => w.date), "Found workout:", workout);
    if (workout && workoutTypes[workout.type]) {
      return (
        <span
          style={{
            display: 'block', // Убедимся, что элемент виден
            width: '15px',
            height: '15px',
            backgroundColor: workoutTypes[workout.type].color,
            borderRadius: '50%',
            margin: '0 auto',
            position: 'relative', // Убедимся, что элемент на верхнем слое
            zIndex: 1 // Поднимаем над другими элементами
          }}
        />
      );
    }
    return null;
  };

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null;
    const dateStr = date.toISOString().split('T')[0];
    return dateStr === selectedDate.toISOString().split('T')[0] ? 'selected-day' : null;
  };

  const onDateChange = (date) => {
    setSelectedDate(date);
    const workout = workouts.find(w => w.date === date.toISOString().split('T')[0]);
    setSelectedWorkout(workout || null);
    if (workout) setSelectedType(workout.type);
  };

  const addExercise = async (e) => {
    e.preventDefault();
    const exerciseData = {
      name: newExercise.name,
      weight: parseFloat(newExercise.weight) || 0,
      sets: parseInt(newExercise.sets) || 0,
      reps: parseInt(newExercise.reps) || 0
    };

    if (!selectedWorkout) {
      const docRef = await addDoc(collection(db, "workouts"), {
        date: selectedDate.toISOString().split('T')[0],
        type: selectedType,
        exercises: [exerciseData],
        timestamp: new Date()
      });
      setWorkouts([...workouts, { id: docRef.id, date: selectedDate.toISOString().split('T')[0], type: selectedType, exercises: [exerciseData], timestamp: new Date() }]);
      setSelectedWorkout({ id: docRef.id, date: selectedDate.toISOString().split('T')[0], type: selectedType, exercises: [exerciseData], timestamp: new Date() });
    } else {
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
      <div className="mt-4">
        <Calendar
          key={workouts.length} // Принудительный перерендеринг при изменении данных
          onChange={onDateChange}
          value={selectedDate}
          tileContent={tileContent}
          tileClassName={tileClassName} // Добавляем кастомный класс для выделения
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
                    {["верх", "низ", "фулбади"].map((type) => (
                      <option key={type} value={type}>
                        {type}
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
              <Button variant="primary" type="submit" className="add-button">
                Добавить
              </Button>
            </Col>
          </Row>
        </Form>
      </div>

      <div className="mt-4">
        <h3>Типы тренировок</h3>
        <ul className="legend-list">
          {["верх", "низ", "фулбади"].map((type) => (
            <li key={type} style={{ color: workoutTypes[type].color }}>
              <span style={{ backgroundColor: workoutTypes[type].color, width: '15px', height: '15px', borderRadius: '50%', display: 'inline-block', marginRight: '5px' }}></span>
              {type}
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}

export default App;