import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            email,
            password,
            role,
            magasin_id,
            nom,
            prenom,
            telephone,
            perimetre
        } = body

        if (!email || !password || !role) {
            return NextResponse.json(
                { error: 'Champs obligatoires manquants: email, password, role' },
                { status: 400 }
            )
        }

        // 1. Créer l'utilisateur dans Supabase Auth via l'Admin SDK
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { prenom, nom, role }
        })

        if (authError) {
            console.error('Auth admin error:', authError)
            return NextResponse.json(
                { error: 'Erreur lors de la création Auth', details: authError.message },
                { status: 500 }
            )
        }

        const userId = authData.user.id

        // 2. Créer l'entrée dans notre table 'users'
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .insert({
                id: userId,
                email,
                role,
                magasin_id: magasin_id || null,
                prenom: prenom || null,
                nom: nom || null,
                telephone: telephone || null,
                perimetre: perimetre || null
            })

        if (dbError) {
            console.error('DB users insert error:', dbError)
            // Tenter de supprimer l'user Auth si l'insertion DB échoue (nettoyage)
            await supabaseAdmin.auth.admin.deleteUser(userId)

            return NextResponse.json(
                { error: 'Erreur lors de la création du profil DB', details: dbError.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            user: {
                id: userId,
                email,
                role
            }
        })

    } catch (error: any) {
        console.error('Create user error:', error)
        return NextResponse.json(
            { error: 'Erreur serveur interne', details: error.message },
            { status: 500 }
        )
    }
}
