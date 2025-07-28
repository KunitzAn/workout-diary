import { Container, Button, ListGroup, Form, Row, Col } from 'react-bootstrap';
import Calendar from 'react-calendar';
import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { workoutTypes } from './constants.jsx';


function App() {
  const [user, setUser] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [newExercise, setNewExercise] = useState({ name: '', weight: '', sets: '', reps: '' });
  const [selectedType, setSelectedType] = useState("ягодицы+плечи");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

useEffect(() => {
  console.log("SessionStorage available:", typeof sessionStorage !== 'undefined' && sessionStorage);
  const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    console.log("Current user:", currentUser);
    if (currentUser) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const workoutsQuery = query(collection(db, "workouts"), where("userId", "==", currentUser.uid));
          const querySnapshot = await getDocs(workoutsQuery);
          const workoutsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            date: doc.data().date.toDate ? doc.data().date.toDate().toISOString().split('T')[0] : doc.data().date,
            type: doc.data().type,
            exercises: doc.data().exercises,
            timestamp: doc.data().timestamp,
            userId: doc.data().userId
          }));
          console.log("Fetched workouts data:", workoutsData);
          setWorkouts(workoutsData);

          const userExercisesQuery = query(collection(db, "userExercises"), where("userId", "==", currentUser.uid));
          const userExercisesSnapshot = await getDocs(userExercisesQuery);
          if (userExercisesSnapshot.empty) {
            console.log("No userExercises document found, creating default for:", currentUser.uid);
            await addDoc(collection(db, "userExercises"), {
              exercises: [],
              userId: currentUser.uid
            });
          }
          const userExercisesData = userExercisesSnapshot.docs.length > 0 ? userExercisesSnapshot.docs[0].data().exercises || [] : [];
          console.log("Fetched user exercises data:", userExercisesData);
          setExercises(userExercisesData);
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
      console.log("No user authenticated, clearing data");
      setWorkouts([]);
      setExercises([]);
    }
  });
  return () => unsubscribeAuth();
}, []);

  const tileContent = ({ date }) => {
    if (loading || !workouts.length) return null;
    const dateStr = date.toISOString().split('T')[0];
    const workout = workouts.find(w => w.date === dateStr);
    console.log("Tile date:", dateStr, "Workout:", workout);
    if (workout && workout.exercises && workout.exercises.length > 0 && workoutTypes[workout.type]) {
      return (
        <span
          style={{
            display: 'block',
            width: '15px',
            height: '15px',
            backgroundColor: workoutTypes[workout.type].color,
            borderRadius: '50%',
            margin: '0 auto',
            position: 'relative',
            zIndex: 1
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

  const deleteExercise = async (exerciseIndex) => {
    if (!selectedWorkout || !user) return;

    const updatedExercises = selectedWorkout.exercises.filter((_, index) => index !== exerciseIndex);
    const workoutDocRef = doc(db, "workouts", selectedWorkout.id);

    if (updatedExercises.length === 0) {
      // Удаляем документ, если больше нет упражнений
      await deleteDoc(workoutDocRef);
      setWorkouts(workouts.filter(w => w.id !== selectedWorkout.id));
      setSelectedWorkout(null);
    } else {
      // Обновляем документ, если остались упражнения
      await updateDoc(workoutDocRef, { exercises: updatedExercises, timestamp: new Date() });
      setWorkouts(workouts.map(w => w.id === selectedWorkout.id ? { ...w, exercises: updatedExercises } : w));
      setSelectedWorkout({ ...selectedWorkout, exercises: updatedExercises });
    }
  };

const addExercise = async (e) => {
  e.preventDefault();
  if (!user) return;

  const exerciseData = {
    name: newExercise.name,
    weight: parseFloat(newExercise.weight) || 0,
    sets: parseInt(newExercise.sets) || 0,
    reps: parseInt(newExercise.reps) || 0
  };

  const dateStr = selectedDate.toISOString().split('T')[0];
  const existingWorkout = workouts.find(w => w.date === dateStr);

  if (existingWorkout) {
    setSelectedType(existingWorkout.type);
  }

  if (!selectedWorkout) {
    const docRef = await addDoc(collection(db, "workouts"), {
      date: dateStr,
      type: selectedType,
      exercises: [exerciseData],
      timestamp: new Date(),
      userId: user.uid
    });
    setWorkouts([...workouts, { id: docRef.id, date: dateStr, type: selectedType, exercises: [exerciseData], timestamp: new Date(), userId: user.uid }]);
    setSelectedWorkout({ id: docRef.id, date: dateStr, type: selectedType, exercises: [exerciseData], timestamp: new Date(), userId: user.uid });
  } else {
    const updatedExercises = [...selectedWorkout.exercises, exerciseData];
    const workoutDocRef = doc(db, "workouts", selectedWorkout.id);
    await updateDoc(workoutDocRef, { exercises: updatedExercises, timestamp: new Date() });
    setWorkouts(workouts.map(w => w.id === selectedWorkout.id ? { ...w, exercises: updatedExercises } : w));
    setSelectedWorkout({ ...selectedWorkout, exercises: updatedExercises });
  }

  // Добавляем упражнение в список пользователя
  if (newExercise.name && newExercise.name.trim()) {
    console.log("Attempting to add exercise:", newExercise.name.trim(), "for user:", user.uid);
    const userExercisesQuery = query(collection(db, "userExercises"), where("userId", "==", user.uid));
    const userExercisesSnapshot = await getDocs(userExercisesQuery);
    const userExerciseDoc = userExercisesSnapshot.docs[0];
    if (userExerciseDoc) {
      const currentExercises = userExerciseDoc.data().exercises || [];
      if (!currentExercises.includes(newExercise.name.trim())) {
        console.log("Updating existing document with exercise:", newExercise.name.trim());
        await updateDoc(doc(db, "userExercises", userExerciseDoc.id), {
          exercises: [...currentExercises, newExercise.name.trim()],
          userId: user.uid
        });
        setExercises(prev => [...prev, newExercise.name.trim()]);
      }
    } else {
      console.log("Creating new userExercises document for:", user.uid);
      await addDoc(collection(db, "userExercises"), {
        exercises: [newExercise.name.trim()],
        userId: user.uid
      });
      setExercises(prev => [...prev, newExercise.name.trim()]);
    }
  } else {
    console.log("No valid exercise name provided:", newExercise.name);
  }

  setNewExercise({ name: '', weight: '', sets: '', reps: '' });
};


return (
  <Container>
    {!user ? (
          <div className="mt-4">
            <h2>Авторизация</h2>
            <Form>
              <Form.Group controlId="formEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Введите email"
                />
              </Form.Group>
              <Form.Group controlId="formPassword">
                <Form.Label>Пароль</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                />
              </Form.Group>
              <Button
                variant="primary"
                className="mt-2"
                onClick={() => createUserWithEmailAndPassword(auth, email, password)
                  .catch((error) => alert(error.message))}
              >
                Зарегистрироваться
              </Button>
              <Button
                variant="primary"
                className="mt-2 ms-2"
                onClick={() => signInWithEmailAndPassword(auth, email, password)
                  .catch((error) => alert(error.message))}
              >
                Войти
              </Button>
            </Form>
          </div>
        ) : (
          <>
        <h1>Workout Diary</h1>
        <Button variant="danger" className="mt-2" onClick={() => signOut(auth)}>Выйти</Button>
        <div className="mt-4">
          <Calendar
            key={workouts.length}
            onChange={onDateChange}
            value={selectedDate}
            tileContent={tileContent}
            tileClassName={tileClassName}
          />
        </div>
        <p className="mt-3">Выбрана дата: {selectedDate.toLocaleDateString()}</p>

        {selectedWorkout && (
          <div className="mt-4">
            <h3>Упражнения для {selectedDate.toLocaleDateString()}</h3>
            <ListGroup>
              {selectedWorkout.exercises.map((exercise, index) => (
                <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                  {exercise.name}: {exercise.weight} кг, {exercise.sets} x {exercise.reps}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => deleteExercise(index)}
                    className="ms-2"
                  >
                    Удалить
                  </Button>
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
                    disabled={!!workouts.find(w => w.date === selectedDate.toISOString().split('T')[0])}
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
                <Form.Group controlId="formExerciseName">
                  <Form.Label>Упражнение</Form.Label>
                  <Form.Control
                    as="select"
                    value={newExercise.name}
                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                    required
                  >
                    <option value="">Выберите или введите новое</option>
                    {exercises.map((exercise, index) => (
                      <option key={index} value={exercise}>
                        {exercise}
                      </option>
                    ))}
                  </Form.Control>
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

          <Form onSubmit={async (e) => {
            e.preventDefault();
            const trimmedName = newExercise.name.trim();
            if (trimmedName && !exercises.includes(trimmedName)) {
              console.log("Adding new exercise to userExercises:", trimmedName, "for user:", user.uid);
              const userExercisesQuery = query(collection(db, "userExercises"), where("userId", "==", user.uid));
              const userExercisesSnapshot = await getDocs(userExercisesQuery);
              const userExerciseDoc = userExercisesSnapshot.docs[0];
              if (userExerciseDoc) {
                const currentExercises = userExerciseDoc.data().exercises || [];
                if (!currentExercises.includes(trimmedName)) {
                  await updateDoc(doc(db, "userExercises", userExerciseDoc.id), {
                    exercises: [...currentExercises, trimmedName],
                    userId: user.uid
                  });
                  setExercises([...exercises, trimmedName]);
                }
              } else {
                await addDoc(collection(db, "userExercises"), {
                  exercises: [trimmedName],
                  userId: user.uid
                });
                setExercises([...exercises, trimmedName]);
              }
              setNewExercise(prev => ({ ...prev, name: '' }));
            } else if (!trimmedName) {
              alert("Введите название упражнения!");
            }
          }}>
            <Row>
              <Col md={3}>
                <Form.Control
                  type="text"
                  className="newex-field"
                  placeholder="Новое упражнение"
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                />
              </Col>
              <Col md={1}>
                <Button variant="secondary" type="submit" className="add-new-ex-button">Добавить в базу</Button>
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
      </>
    )}
  </Container>
);

}

export default App;