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
): Promise<TurmaActionResult> {
  try {
    const parsed = v.safeParse(denunciarLinkSchema, {
      linkId,
    })

    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.issues[0]?.message ?? 'Link inválido.',
      }
    }

    const supabase = await createClient()

    const { error } = await supabase.rpc('incrementar_reports_link', {
      p_link_id: parsed.output.linkId,
    })

    if (error) {
      console.error('[SIGAA Hub] Erro ao denunciar link:', error)

      return {
        ok: false,
        message:
          'Não foi possível registrar a denúncia. Verifique se a RPC incrementar_reports_link existe no Supabase.',
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
