const supabase = require('../config/supabaseClient');
const { erroDeValidacao } = require('./settings.service');

const TAMANHO_MAXIMO = 500;

function normalizarTitulo(valor) {
  const titulo = String(valor == null ? '' : valor).trim();
  if (!titulo) throw erroDeValidacao('A tarefa precisa de um titulo.');
  if (titulo.length > TAMANHO_MAXIMO) {
    throw erroDeValidacao(`O titulo passa de ${TAMANHO_MAXIMO} caracteres.`);
  }
  return titulo;
}

// Lista as tarefas: pendentes primeiro, mais recentes no topo
async function listTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('done', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Cria a tarefa; se ja existir uma pendente igual, devolve a existente
async function createTodo({ title, sourceDate = null }) {
  const titulo = normalizarTitulo(title);

  const { data: existente, error: erroBusca } = await supabase
    .from('todos')
    .select('*')
    .eq('title', titulo)
    .eq('done', false)
    .limit(1);

  if (erroBusca) throw erroBusca;
  if (existente && existente.length > 0) {
    return { todo: existente[0], criada: false };
  }

  const { data, error } = await supabase
    .from('todos')
    .insert({ title: titulo, source_date: sourceDate || null })
    .select()
    .single();

  if (error) throw error;
  return { todo: data, criada: true };
}

// Atualiza titulo e/ou conclusao, cuidando do completed_at
async function updateTodo(id, alteracoes = {}) {
  const campos = {};

  if (alteracoes.title !== undefined) {
    campos.title = normalizarTitulo(alteracoes.title);
  }

  if (alteracoes.done !== undefined) {
    if (typeof alteracoes.done !== 'boolean') {
      throw erroDeValidacao('O campo done deve ser true ou false.');
    }
    campos.done = alteracoes.done;
    campos.completed_at = alteracoes.done ? new Date().toISOString() : null;
  }

  if (Object.keys(campos).length === 0) {
    throw erroDeValidacao('Nenhum campo valido para atualizar.');
  }

  const { data, error } = await supabase
    .from('todos')
    .update(campos)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const naoEncontrada = new Error('Tarefa nao encontrada.');
    naoEncontrada.status = 404;
    throw naoEncontrada;
  }
  return data;
}

async function deleteTodo(id) {
  const { data, error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const naoEncontrada = new Error('Tarefa nao encontrada.');
    naoEncontrada.status = 404;
    throw naoEncontrada;
  }
  return data;
}

module.exports = { listTodos, createTodo, updateTodo, deleteTodo };
