import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File
        const category = formData.get('category') as string || 'echantillon_lri'
        const archiveMissing = formData.get('archiveMissing') === 'true'

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const workbook = XLSX.read(bytes, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        // Ignorer la première ligne (headers)
        const rows = data.slice(1).filter(row => row[0] || row[1] || row[2])

        // Initialiser Supabase Admin
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        let created = 0
        let errors = 0
        let modelesCount = 0
        let archivedCount = 0
        const processedProduitIds: string[] = []

        if (category.includes('echantillon')) {
            // LOGIQUE POUR ÉCHANTILLONS (Modèle -> Tissu)

            // 1. Extraire les modèles uniques
            const modelesUniques = [...new Set(rows.map(row => row[0]).filter(Boolean))] as string[]
            const modelesMap: Record<string, string> = {}

            for (const nomModele of modelesUniques) {
                const { data: existing } = await supabase
                    .from('modeles')
                    .select('id')
                    .eq('nom', nomModele)
                    .single()

                if (existing) {
                    modelesMap[nomModele] = existing.id
                } else {
                    const { data: inserted, error } = await supabase
                        .from('modeles')
                        .insert({ nom: nomModele })
                        .select()
                        .single()

                    if (!error && inserted) {
                        modelesMap[nomModele] = inserted.id
                        modelesCount++
                    }
                }
            }

            // 2. Insérer/Update les produits
            for (const row of rows) {
                const modeleNom = row[0] as string
                const gammeTissu = row[1] as string
                const reference = row[2] as string
                const typeTissu = row[3] as string
                const couleur = row[4] as string
                const housseAmovible = row[5] === true || row[5] === 'TRUE' || row[5] === 'VRAI'
                const statutCollection = row[6] as string

                const modeleId = modelesMap[modeleNom]
                if (!modeleId) continue

                const nomProduit = `${modeleNom} - ${reference}`

                const { data: upserted, error } = await supabase
                    .from('produits')
                    .upsert({
                        nom: nomProduit,
                        reference: reference,
                        description: `${typeTissu || ''} - ${couleur || ''}`.trim(),
                        modele_id: modeleId,
                        gamme_tissu: gammeTissu,
                        type_tissu: typeTissu,
                        couleur: couleur,
                        housse_amovible: housseAmovible,
                        statut_collection: statutCollection,
                        categorie: category,
                        actif: true // On s'assure qu'ils redeviennent actifs s'ils étaient archivés
                    }, {
                        onConflict: 'reference,modele_id'
                    })
                    .select('id')
                    .single()

                if (error) {
                    console.error('Import error:', error)
                    errors++
                } else {
                    created++
                    if (upserted) processedProduitIds.push(upserted.id)
                }
            }
        } else {
            // LOGIQUE POUR AUTRES CATÉGORIES (Consommables, Pentes, etc.)
            for (const row of rows) {
                const nom = row[0] as string
                const reference = row[1] as string
                const description = row[2] as string

                if (!nom || !reference) continue

                const { data: upserted, error } = await supabase
                    .from('produits')
                    .upsert({
                        nom: nom,
                        reference: reference,
                        description: description,
                        categorie: category,
                        actif: true
                    }, {
                        onConflict: 'reference'
                    })
                    .select('id')
                    .single()

                if (error) {
                    console.error('Import error:', error)
                    errors++
                } else {
                    created++
                    if (upserted) processedProduitIds.push(upserted.id)
                }
            }
        }

        // 3. ARCHIVAGE DES OBSOLETS
        if (archiveMissing && processedProduitIds.length > 0) {
            const { data: archived, error: archError } = await supabase
                .from('produits')
                .update({ actif: false })
                .eq('categorie', category)
                .not('id', 'in', `(${processedProduitIds.join(',')})`)
                .select()

            if (!archError && archived) {
                archivedCount = archived.length
            }
        }

        return NextResponse.json({
            message: 'Import terminé',
            summary: {
                modeles: modelesCount,
                produits: created,
                archived: archivedCount,
                erreurs: errors
            }
        })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
