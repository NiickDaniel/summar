const todosService = require('../services/todos.service');
const { responderErro } = require('../utils/http');

// GET /api/todos: pendentes primeiro, mais recentes no topo
async function listTodos(req, res) {
  try {
    return res.status(200).json(await todosService.listTodos());
  } catch (err) {
    return responderErro(res, err, 'todos', 'Falha ao buscar as tarefas.');
  }
}

// POST /api/todos: cria a tarefa (vinda de um resumo ou digitada na tela)
async function createTodo(req, res) {
  try {
    const { title, source_date: sourceDate } = req.body || {};
    const { todo, criada } = await todosService.createTodo({ title, sourceDate });
    return res.status(criada ? 201 : 200).json(todo);
  } catch (err) {
    return responderErro(res, err, 'todos', 'Falha ao criar a tarefa.');
  }
}

// PATCH /api/todos/:id: marca como concluida ou edita o titulo
async function updateTodo(req, res) {
  try {
    return res.status(200).json(await todosService.updateTodo(req.params.id, req.body || {}));
  } catch (err) {
    return responderErro(res, err, 'todos', 'Falha ao atualizar a tarefa.');
  }
}

// DELETE /api/todos/:id
async function deleteTodo(req, res) {
  try {
    await todosService.deleteTodo(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return responderErro(res, err, 'todos', 'Falha ao remover a tarefa.');
  }
}

module.exports = { listTodos, createTodo, updateTodo, deleteTodo };
