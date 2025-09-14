import { useState, useEffect } from "react";
import { auth, db, signInWithGoogle } from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faEdit,
  faSignOutAlt,
  faSignInAlt,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Force refresh of user data
        await firebaseUser.reload();

        // Get the updated user object
        const updatedUser = auth.currentUser;

        setUser({
          uid: updatedUser.uid,
          displayName:
            updatedUser.displayName.split(" ")[0] || updatedUser.email.split("@")[0], // Fallback
          email: updatedUser.email,
          photoURL: updatedUser.photoURL || "https://via.placeholder.com/150", // Fallback
        });

        fetchTasks(updatedUser.uid);
      } else {
        setUser(null);
        setTasks([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchTasks = (userId) => {
    const q = query(collection(db, "tasks"), where("userId", "==", userId));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData = [];
      querySnapshot.forEach((doc) => {
        tasksData.push({ id: doc.id, ...doc.data() });
      });
      setTasks(
        tasksData.sort(
          (a, b) => new Date(a.dueDateTime) - new Date(b.dueDateTime)
        )
      );
    });
    return unsubscribe;
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const dueDateTime =
      dueDate && dueTime
        ? new Date(`${dueDate}T${dueTime}`).toISOString()
        : null;

    await addDoc(collection(db, "tasks"), {
      text: newTask,
      completed: false,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      dueDateTime: dueDateTime,
    });

    setNewTask("");
    setDueDate("");
    setDueTime("");
  };

  const handleCompleteTask = async (taskId, completed) => {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, { completed: !completed });
  };

  const handleDeleteTask = async (taskId) => {
    await deleteDoc(doc(db, "tasks", taskId));
  };

  const handleEditTask = (task) => {
    setEditingTask(task.id);
    setEditText(task.text);
  };

  const handleUpdateTask = async (taskId) => {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, { text: editText });
    setEditingTask(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No deadline";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-indigo-100">
      <nav className="bg-white shadow-md">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center flex-shrink-0">
              <div className="flex items-center space-x-2">
                <img className="w-7" src="./public/favicon.svg" alt="" />
                <h1 className="text-xl font-bold text-indigo-600">To-Do-List</h1>
              </div>
            </div>
            <div className="flex items-center">
              {user ? (
                <div className="flex items-center space-x-2">
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User profile"}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      e.target.src = "https://www.gravatar.com/avatar/?d=mp"; // Default avatar
                      e.target.onerror = null; // Prevent infinite loop
                    }}
                    referrerPolicy="no-referrer" // Fixes broken Google images in some cases
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {user.displayName}
                  </span>
                  <button
                    onClick={() => signOut(auth)}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-red-500 rounded-md shadow hover:bg-red-600 focus:outline-none"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="mr-1" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="inline-flex items-center px-4 py-2 text-base font-medium text-white rounded-md shadow-md bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none"
                >
                  <FontAwesomeIcon icon={faSignInAlt} className="mr-2" />
                  Sign In with Google
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {user ? (
          <div className="px-4 py-6 sm:px-0">
            <div className="overflow-hidden bg-white rounded-lg shadow-lg">
              <div className="p-6">
                <form onSubmit={handleAddTask} className="mb-6">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <input
                      type="text"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="Add a new task..."
                      className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 text-white rounded-md shadow-md bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-1" />
                      Add Task
                    </button>
                  </div>
                </form>

                <div className="space-y-4">
                  {tasks.length === 0 ? (
                    <p className="py-4 text-center text-gray-500">
                      No tasks yet. Add one above!
                    </p>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-4 border rounded-lg flex justify-between items-center shadow-sm hover:shadow-md transition ${
                          task.completed ? "bg-gray-100" : "bg-white"
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() =>
                              handleCompleteTask(task.id, task.completed)
                            }
                            className={`h-6 w-6 rounded-full border flex items-center justify-center ${
                              task.completed
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-gray-300"
                            }`}
                          >
                            {task.completed && (
                              <FontAwesomeIcon icon={faCheck} size="xs" />
                            )}
                          </button>
                          <div>
                            {editingTask === task.id ? (
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="border-b border-gray-300 focus:outline-none focus:border-indigo-500"
                                onBlur={() => handleUpdateTask(task.id)}
                                onKeyPress={(e) =>
                                  e.key === "Enter" && handleUpdateTask(task.id)
                                }
                                autoFocus
                              />
                            ) : (
                              <p
                                className={`${
                                  task.completed
                                    ? "line-through text-gray-500"
                                    : "text-gray-800"
                                }`}
                              >
                                {task.text}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              {formatDate(task.dueDateTime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {!task.completed && (
                            <button
                              onClick={() => handleEditTask(task)}
                              className="p-2 text-blue-500 hover:text-blue-700"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 text-red-500 hover:text-red-700"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-800">
              Welcome to To-Do List
            </h2>
            <p className="mb-6 text-gray-600">
              Please sign in with Google to manage your tasks
            </p>
      
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
