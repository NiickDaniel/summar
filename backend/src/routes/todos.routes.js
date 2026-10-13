const { Router } = require('express');
const {
  listTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} = require('../controllers/todos.controller');

const router = Router();

router.get('/todos', listTodos);
router.post('/todos', createTodo);
router.patch('/todos/:id', updateTodo);
router.delete('/todos/:id', deleteTodo);

module.exports = router;
