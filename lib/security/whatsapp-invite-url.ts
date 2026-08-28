const WHATSAPP_INVITE_PATH_REGEX = /^\/([A-Za-z0-9_-]+)\/?$/;

/**
 * Valida um convite do WhatsApp e devolve a URL canônica sem query string,
 * fragmento ou barra final.
 */
export function normalizeWhatsAppInviteUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());

    if (
      url.protocol !== "https:" ||
      url.hostname !== "chat.whatsapp.com" ||
      url.port !== "" ||
      url.username !== "" ||
      url.password !== ""
    ) {
      return null;
    }

    const match = url.pathname.match(WHATSAPP_INVITE_PATH_REGEX);
    if (!match) return null;

    return `https://chat.whatsapp.com/${match[1]}`;
  } catch {
    return null;
  }
}
