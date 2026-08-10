/**
 * Contact Information Configuration
 * Central source for all business contact details.
 * Import CONTACT wherever phone / address / social links are needed.
 */

export const CONTACT = {
    /** Display phone number — shown in footer, navbar drawer, contact page */
    phone: '+8801410125508',

    /** WhatsApp number — digits only, no spaces or + sign */
    whatsapp: '8801410125508',

    /** Payment / bKash tap-to-copy number used in Checkout */
    bkashNumber: '01410125508',

    /** Support email — shown in footer if set */
    email: 'Shinyshades@mailbox.org',

    /** Physical office address */
    address: ' Dhaka, Mohammadpur, Kaderabad Housing ',

    /** Instagram profile URL — leave '' to hide icon */
    instagram: 'https://www.instagram.com/shinyshades.store/',

    /** Facebook page URL — leave '' to hide icon */
    facebook: 'https://www.facebook.com/shinyshades/',

    /** Facebook Messenger URL — leave '' if unused */
    messenger: 'https://m.me/shinyshades',
} as const;

export type ContactConfig = typeof CONTACT;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns a wa.me link, optionally with a pre-filled message */
export const getWhatsAppLink = (message = '') => {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${CONTACT.whatsapp}${message ? `?text=${encoded}` : ''}`;
};

/** Returns the full address as a single string */
export const getFullAddress = () => CONTACT.address;

// ─── Legacy alias kept for any file still importing contactConfig ─────────────
export const contactConfig = {
    whatsappNumber: CONTACT.whatsapp,
    phoneNumber: CONTACT.phone,
    supportEmail: CONTACT.email,
    address: {
        street: 'Kaderabad Housing',
        city: 'Mohammadpur, Dhaka',
        state: '',
        zipCode: '',
        country: 'Bangladesh',
    },
    facebookUrl: CONTACT.facebook,
    instagramUrl: CONTACT.instagram,
    messengerUrl: CONTACT.messenger,
} as const;

export type ContactConfigLegacy = typeof contactConfig;