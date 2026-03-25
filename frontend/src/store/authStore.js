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
    // Token localStorage da saqlanmaydi — httpOnly cookie'da.
    // isAuthenticated foydalanuvchi ob'ekti borligiga qarab aniqlanadi.
    isAuthenticated: !!safeParseUser(),

    // login va setAuth — bir xil funksiya (Login va Register sahifalari uchun)
    login: (userData) => {
        const userObj = userData?.user || userData
        localStorage.setItem('user', JSON.stringify(userObj))
        set({ user: userObj, isAuthenticated: true })
    },

    setAuth: (userData) => {
        const userObj = userData?.user || userData
        localStorage.setItem('user', JSON.stringify(userObj))
        set({ user: userObj, isAuthenticated: true })
    },

    logout: () => {
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
