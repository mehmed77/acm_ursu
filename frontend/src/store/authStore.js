import { create } from 'zustand'

const safeParseUser = () => {
    try {
        const raw = localStorage.getItem('user')
        if (!raw || raw === 'undefined') return null
        return JSON.parse(raw)
    } catch {
        return null
    }
}

export const useAuthStore = create((set) => ({
    user: safeParseUser(),
    isAuthenticated: !!localStorage.getItem('access_token'),

    login: (userData, tokens) => {
        localStorage.setItem('access_token', tokens.access)
        localStorage.setItem('refresh_token', tokens.refresh)

        const userObj = userData.user || userData

        localStorage.setItem('user', JSON.stringify(userObj))

        set({
            user: userObj,
            isAuthenticated: true,
        })
    },

    logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        set({ user: null, isAuthenticated: false })
    },

    updateUser: (data) => {
        const current = safeParseUser() || {}
        const updated = { ...current, ...data }
        localStorage.setItem('user', JSON.stringify(updated))
        set({ user: updated })
    },
}))

export default useAuthStore
