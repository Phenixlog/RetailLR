import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { commande_id, magasin_id, produit_id, quantite } = body

        console.log('Received update request:', { commande_id, magasin_id, produit_id, quantite })

        if (!commande_id || !magasin_id || !produit_id || quantite === undefined) {
            return NextResponse.json(
                { error: 'Champs obligatoires manquants' },
                { status: 400 }
            )
        }

        if (quantite < 1) {
            return NextResponse.json(
                { error: 'La quantité doit être supérieure à 0' },
                { status: 400 }
            )
        }

        // Check if entry exists
        const { data: existing } = await supabaseAdmin
            .from('commande_magasin_produits')
            .select('id')
            .eq('commande_id', commande_id)
            .eq('magasin_id', magasin_id)
            .eq('produit_id', produit_id)
            .single()

        let result

        if (existing) {
            // Update existing entry
            const { data, error } = await supabaseAdmin
                .from('commande_magasin_produits')
                .update({ quantite })
                .eq('id', existing.id)
                .select()
                .single()

            if (error) {
                console.error('Error updating quantity:', error)
                return NextResponse.json(
                    { error: 'Erreur lors de la mise à jour', details: error.message },
                    { status: 500 }
                )
            }
            result = data
        } else {
            // Insert new entry
            const { data, error } = await supabaseAdmin
                .from('commande_magasin_produits')
                .insert({
                    commande_id,
                    magasin_id,
                    produit_id,
                    quantite
                })
                .select()
                .single()

            if (error) {
                console.error('Error inserting quantity:', error)
                return NextResponse.json(
                    { error: 'Erreur lors de l\'insertion', details: error.message },
                    { status: 500 }
                )
            }
            result = data
        }

        return NextResponse.json({ success: true, data: result })

    } catch (error: any) {
        console.error('Update quantity error:', error)
        return NextResponse.json(
            { error: 'Erreur serveur interne', details: error.message },
            { status: 500 }
        )
    }
}
