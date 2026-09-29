import { NextResponse } from 'next/server';
import {
  getChecklistByDate,
  toggleChecklistItem,
  createChecklistTemplate,
  deleteChecklistTemplate,
  updateChecklistTemplatesOrder,
  isDBAvailable
} from '@/lib/db';

function getBrasiliaDateStr() {
  const nowBr = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return nowBr.toISOString().split('T')[0];
}

export async function GET(request) {
  try {
    if (!isDBAvailable()) {
      return NextResponse.json({ items: [], total: 0, concluidos: 0, progresso: 0 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('data') || getBrasiliaDateStr();

    const items = await getChecklistByDate(dateStr);
    const total = items.length;
    const concluidos = items.filter(i => i.concluido).length;
    const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0;

    return NextResponse.json({
      data: dateStr,
      items,
      total,
      concluidos,
      progresso
    });
  } catch (error) {
    console.error('Erro ao buscar checklist:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!isDBAvailable()) {
      return NextResponse.json({ message: 'DB not available' }, { status: 503 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'toggle') {
      const { template_id, data, concluido, observacao, concluido_por } = body;
      if (!template_id || !data) {
        return NextResponse.json({ error: 'Parâmetros template_id e data são obrigatórios' }, { status: 400 });
      }

      const res = await toggleChecklistItem({
        template_id: parseInt(template_id),
        data,
        concluido: !!concluido,
        observacao,
        concluido_por
      });

      return NextResponse.json(res, { status: 200 });
    }

    if (action === 'create') {
      const { titulo, descricao, periodo, ordem } = body;
      if (!titulo) {
        return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 });
      }

      const res = await createChecklistTemplate({
        titulo,
        descricao,
        periodo: periodo || 'manha',
        ordem: parseInt(ordem) || 0
      });

      return NextResponse.json(res, { status: 201 });
    }

    if (action === 'reorder') {
      const { items } = body;
      if (!Array.isArray(items)) {
        return NextResponse.json({ error: 'items array é obrigatório' }, { status: 400 });
      }

      await updateChecklistTemplatesOrder(items);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error) {
    console.error('Erro ao processar checklist:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    if (!isDBAvailable()) {
      return NextResponse.json({ message: 'DB not available' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    await deleteChecklistTemplate(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir item do checklist:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
