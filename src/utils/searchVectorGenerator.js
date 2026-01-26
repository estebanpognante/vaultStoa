export const generateSearchVector = (...inputs) => {
    const combined = inputs.filter(Boolean).join(' ').toLowerCase();
    // Split by spaces, non-alphanumeric (keep dashes/dots maybe? Spec says "NB-VENTAS-05" so we should keep dashes)
    // Simple split by space
    const tokens = combined.split(/\s+/);

    // Also add partials? Spec says "search_vector... tags en minusculas: nombre de usuario...".
    // Usually tokens are enough.

    const unique = [...new Set(tokens)].filter(t => t.length > 1);
    return unique;
};
