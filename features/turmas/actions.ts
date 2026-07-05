'use server'

import { revalidatePath } from 'next/cache'
import * as v from 'valibot'

import { createClient } from '@/lib/supabase/server'

const WHATSAPP_INVITE_REGEX =
  /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+\/?$/

const adicionarLinkSchema = v.object({
  turmaId: v.pipe(v.string(), v.uuid('Turma inválida.')),
  url: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Informe o link do grupo.'),
    v.regex(
      WHATSAPP_INVITE_REGEX,
      'O link deve começar com https://chat.whatsapp.com/',
    ),
  ),
})

const denunciarLinkSchema = v.object({
  linkId: v.pipe(v.string(), v.uuid('Link inválido.')),
  motivo: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(10, 'Informe um motivo com pelo menos 10 caracteres.'),
    v.maxLength(150, 'O motivo deve ter no máximo 150 caracteres.'),
  ),
})

export type TurmaActionResult =
  | {
      ok: true
      message: string
    }
  | {
      ok: false
      message: string
    }

export async function adicionarLink(
  turmaId: string,
  url: string,
): Promise<TurmaActionResult> {
  try {
    const parsed = v.safeParse(adicionarLinkSchema, {
      turmaId,
      url,
    })

    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.issues[0]?.message ?? 'Dados inválidos.',
      }
    }

    const supabase = await createClient()

    const { error } = await supabase.from('links').insert({
      turma_id: parsed.output.turmaId,
      url_whatsapp: parsed.output.url,
    })

    if (error) {
      if (error.code === '23505') {
        return {
          ok: false,
          message: 'Esta turma já possui esse link cadastrado.',
        }
      }

      if (error.code === '23514') {
        return {
          ok: false,
          message:
            'Link inválido. Use um convite que comece com https://chat.whatsapp.com/',
        }
      }

      console.error('[SIGAA Hub] Erro ao adicionar link:', error)

      return {
        ok: false,
        message: 'Não foi possível adicionar o link. Tente novamente.',
      }
    }

    revalidatePath('/')

    return {
      ok: true,
      message: 'Link adicionado com sucesso.',
    }
  } catch (error) {
    console.error('[SIGAA Hub] Erro inesperado ao adicionar link:', error)

    return {
      ok: false,
      message: 'Erro inesperado ao adicionar o link.',
    }
  }
}

export async function denunciarLink(
  linkId: string,
  motivo: string,
): Promise<TurmaActionResult> {
  try {
    const parsed = v.safeParse(denunciarLinkSchema, {
      linkId,
      motivo,
    })

    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.issues[0]?.message ?? 'Dados inválidos.',
      }
    }

    console.log('[SIGAA Hub] Denúncia de link recebida:', {
      linkId: parsed.output.linkId,
      motivo: parsed.output.motivo,
      receivedAt: new Date().toISOString(),
    })

    const supabase = await createClient()

    const rpcResult = await supabase.rpc('incrementar_reports_link', {
      p_link_id: parsed.output.linkId,
    })

    if (rpcResult.error) {
      console.warn(
        '[SIGAA Hub] RPC incrementar_reports_link falhou. Tentando fallback read/update:',
        rpcResult.error,
      )

      const { data: linkAtual, error: selectError } = await supabase
        .from('links')
        .select('reports')
        .eq('id', parsed.output.linkId)
        .single()

      if (selectError) {
        console.error('[SIGAA Hub] Erro ao buscar reports atual:', selectError)

        return {
          ok: false,
          message:
            'Não foi possível registrar a denúncia. Verifique as permissões de leitura/update ou a RPC no Supabase.',
        }
      }

      const { error: updateError } = await supabase
        .from('links')
        .update({
          reports: (linkAtual?.reports ?? 0) + 1,
        })
        .eq('id', parsed.output.linkId)

      if (updateError) {
        console.error('[SIGAA Hub] Erro ao atualizar reports:', updateError)

        return {
          ok: false,
          message:
            'Não foi possível registrar a denúncia. Verifique se a tabela links permite atualização de reports ou crie a RPC incrementar_reports_link.',
        }
      }
    }

    revalidatePath('/')

    return {
      ok: true,
      message: 'Denúncia registrada com sucesso.',
    }
  } catch (error) {
    console.error('[SIGAA Hub] Erro inesperado ao denunciar link:', error)

    return {
      ok: false,
      message: 'Erro inesperado ao registrar denúncia.',
    }
  }
}
