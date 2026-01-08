/**
 * Script d'import des données LRI depuis fichier Excel
 * Usage: node scripts/import-lri-data.js
 */

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' });

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables d\'environnement manquantes:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Chemin du fichier Excel
const EXCEL_FILE = path.join(__dirname, '..', 'Copie de LRI Demande échantillons canapé PE25 (3).xlsx');

async function importData() {
    console.log('🚀 Début de l\'import LRI...\n');

    // 1. Lire le fichier Excel
    console.log('📖 Lecture du fichier Excel...');
    const workbook = XLSX.readFile(EXCEL_FILE);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Ignorer la première ligne (headers)
    const rows = data.slice(1).filter(row => row[0] && row[1] && row[2]);

    console.log(`   ✓ ${rows.length} lignes trouvées\n`);

    // 2. Extraire les modèles uniques
    const modelesUniques = [...new Set(rows.map(row => row[0]).filter(Boolean))];
    console.log(`📦 ${modelesUniques.length} modèles uniques trouvés:`);
    console.log(`   ${modelesUniques.join(', ')}\n`);

    // 3. Insérer les modèles
    console.log('💾 Insertion des modèles...');
    const modelesMap = {};

    for (const nomModele of modelesUniques) {
        const { data: existing } = await supabase
            .from('modeles')
            .select('id')
            .eq('nom', nomModele)
            .single();

        if (existing) {
            modelesMap[nomModele] = existing.id;
            console.log(`   ⏭️  ${nomModele} existe déjà`);
        } else {
            const { data: inserted, error } = await supabase
                .from('modeles')
                .insert({ nom: nomModele })
                .select()
                .single();

            if (error) {
                console.error(`   ❌ Erreur pour ${nomModele}:`, error.message);
            } else {
                modelesMap[nomModele] = inserted.id;
                console.log(`   ✅ ${nomModele} créé`);
            }
        }
    }

    console.log(`\n💾 Insertion des produits (tissus)...`);

    // 4. Insérer les produits
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of rows) {
        const modeleNom = row[0];
        const gammeTissu = row[1];
        const reference = row[2];
        const typeTissu = row[3];
        const couleur = row[4];
        const housseAmovible = row[5] === true || row[5] === 'TRUE' || row[5] === 'VRAI';
        const statutCollection = row[6];

        const modeleId = modelesMap[modeleNom];

        if (!modeleId) {
            console.log(`   ⚠️  Modèle non trouvé pour: ${modeleNom}`);
            errors++;
            continue;
        }

        // Créer un nom de produit lisible
        const nomProduit = `${modeleNom} - ${reference}`;

        // Vérifier si le produit existe déjà (par référence)
        const { data: existing } = await supabase
            .from('produits')
            .select('id')
            .eq('reference', reference)
            .eq('modele_id', modeleId)
            .single();

        if (existing) {
            skipped++;
            continue;
        }

        const { error } = await supabase
            .from('produits')
            .insert({
                nom: nomProduit,
                reference: reference,
                description: `${typeTissu} - ${couleur}`,
                modele_id: modeleId,
                gamme_tissu: gammeTissu,
                type_tissu: typeTissu,
                couleur: couleur,
                housse_amovible: housseAmovible,
                statut_collection: statutCollection,
                categorie: 'echantillon_lri'
            });

        if (error) {
            console.log(`   ❌ Erreur: ${reference} - ${error.message}`);
            errors++;
        } else {
            created++;
        }
    }

    console.log(`\n✅ Import terminé!`);
    console.log(`   📊 Résumé:`);
    console.log(`   - Modèles: ${modelesUniques.length}`);
    console.log(`   - Produits créés: ${created}`);
    console.log(`   - Produits ignorés (déjà existants): ${skipped}`);
    console.log(`   - Erreurs: ${errors}`);
}

// Exécution
importData().catch(console.error);
