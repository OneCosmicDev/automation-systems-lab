# Démarrer avec un agent

Ce prompt permet à un **agent de programmation ayant accès au terminal et aux fichiers de votre ordinateur** de préparer un environnement local, de connecter les outils n8n disponibles et de vérifier le parcours réel. Un agent qui peut uniquement lire GitHub ne peut pas installer des services sur votre machine.

Il s'agit d'une procédure d'installation assistée, pas d'un installateur déjà validé pour toutes les applications d'agents. La connexion dépend de vos accès, de votre client MCP et de votre instance n8n. La configuration d'un compte, la saisie privée d'une clé ou le rechargement du client peuvent demander votre intervention.

## Prompt à copier

```text
Prépare sur mon ordinateur un environnement local de développement de workflows n8n à partir de :
https://github.com/OneCosmicDev/automation-systems-lab

Je veux pouvoir te demander ensuite de concevoir, reproduire, valider, importer et tester des workflows n8n. Effectue les étapes réalisables avec tes outils ; ne te limite pas à me donner une liste de commandes. Travaille dans un environnement local dédié avec des données fictives.

1. Inspecte avant de modifier.
   - Détecte le système, le terminal, les versions de Node/npm/Git et la présence d'un moteur Docker fonctionnel.
   - Réutilise le checkout de ce dépôt s'il est déjà ouvert ; sinon clone-le dans un dossier disponible. Préserve les changements existants.
   - Lis AGENTS.md, README.md, docs/architecture.md, docs/operations.md et docs/agents.md.
   - Détecte les services locaux et les outils MCP déjà disponibles. N'écrase aucune configuration ni instance existante. Si la cible est ambiguë, demande uniquement l'information nécessaire pour la choisir.
   - Le choix par défaut est une instance n8n locale dédiée. Une instance distante ou de production demande une instruction explicite et une adaptation de sécurité ; le déployeur fourni refuse les URL distantes.

2. Vérifie le dépôt.
   - Installe les dépendances avec npm ci --ignore-scripts.
   - Exécute npm run check et npm run demo. Corrige un problème local de configuration si possible ; rapporte les vrais échecs.
   - Utilise npm run setup pour préparer .env sans écraser les valeurs existantes.
   - Distingue les deux chemins : le service MCP/HTTP du dépôt exécute des démonstrations locales ; les exports n8n fonctionnent dans n8n. run_automation n'est pas un outil de pilotage de n8n.

3. Prépare n8n.
   - Si Docker Engine fonctionne, utilise compose.yml pour démarrer l'instance de démonstration, après avoir vérifié que son port et son projet Compose ne sont pas déjà utilisés par un autre environnement.
   - Garde l'accès sur l'interface locale et conserve le volume persistant. Ne supprime aucun volume pour résoudre un problème.
   - Si Docker manque ou nécessite un redémarrage/une installation système, explique l'étape minimale requise et continue les vérifications indépendantes. Ne prétends pas que n8n est prêt.
   - Si la création du compte propriétaire ou d'une clé demande mon intervention, guide-moi dans l'interface n8n. Les secrets doivent être saisis dans .env ou dans le gestionnaire de secrets du client, jamais dans cette conversation.
   - Vérifie la disponibilité de n8n, puis l'accès authentifié. Une page de connexion accessible ne prouve pas que l'API fonctionne.

4. Connecte les vrais outils de développement n8n.
   - Réutilise un connecteur n8n adapté déjà installé. Sinon, consulte les sources officielles du connecteur communautaire https://github.com/czlonkowski/n8n-mcp et choisis une version précise et compatible. Le dépôt de référence ne fournit pas lui-même ce connecteur.
   - Vérifie sa documentation actuelle et ses permissions avant de l'installer localement ; évite une installation globale si une installation dédiée suffit. Note la version retenue.
   - Configure le transport et le fichier de paramètres réellement pris en charge par mon application d'agent. Préserve les autres serveurs et paramètres. N'invente pas un format universel de configuration MCP.
   - Injecte N8N_API_URL et N8N_API_KEY depuis une source privée. Pour les opérations qui l'exigent, configure séparément N8N_MCP_ACCESS_TOKEN. Une clé API n'est pas automatiquement un jeton du MCP natif n8n.
   - Pour un serveur stdio, évite les logs sur stdout. Pour une cible loopback, applique uniquement le réglage réseau documenté nécessaire ; ne désactive pas globalement les protections réseau.
   - N'inscris pas de secrets dans les arguments de commande, les fichiers suivis, les captures, les logs ou la réponse finale. Ne suppose pas que ${VARIABLE} sera interpolé par tous les clients.
   - Si le client doit être redémarré pour charger un serveur, fournis un point de reprise dans .data/bootstrap-status.md et indique la manipulation exacte. Après reprise, redécouvre les outils.
   - Vérifie les capacités réellement présentes : documentation des nœuds, liste/lecture des workflows, validation, création et méthode d'exécution adaptée. Un serveur limité à la documentation n'est pas une connexion opérationnelle.
   - Les permissions runner/maintainer du laboratoire ne protègent pas automatiquement ce connecteur externe. Limite sa portée à l'instance dédiée et aux opérations nécessaires.

5. Prouve la connexion par un exemple réel.
   - Utilise workflows/lead-intake.json comme premier exemple ; son nom et ses données sont fictifs. Vérifie si une copie existe déjà avant d'en créer une autre.
   - Valide le graphe, importe-le inactif et enregistre son identifiant uniquement dans .data/. Ne modifie pas les exports publics pour y ajouter des IDs locaux.
   - Exécute le workflow importé avec un mécanisme réellement disponible. Les graphes fournis ont un déclencheur manuel : n'invente pas un endpoint REST d'exécution et ne suppose pas qu'un test par webhook peut les lancer.
   - Si le connecteur utilise le MCP natif n8n pour ce type de déclencheur, configure l'accès uniquement à cet exemple local, selon les permissions de mon compte et la documentation. Une demande d'autorisation de l'application doit rester sous mon contrôle.
   - Si seule une exécution via CLI ou interface n8n est possible, effectue ce test et indique clairement que l'exécution par l'agent reste à terminer. npm run test:n8n vérifie des conteneurs éphémères ; il ne prouve pas la connexion de ton client à mon instance persistante.
   - Compare le résultat à la fixture : email alex@example.com, route relationship-team, nextAction review, delivery simulated. Rapporte le statut réel de l'exécution.
   - N'active aucun horaire ou webhook et n'envoie aucun email/SMS/message réel pour cette installation.

6. Prépare les prochaines demandes de workflows.
   - Conserve les workflows personnels et leurs IDs dans un espace local privé, distinct des exemples publics. Utilise .data/workflows/ pour l'essai ; pour un projet durable, propose un dépôt privé dédié avec sauvegarde/versionnement.
   - Avant chaque nouveau workflow : préciser le déclencheur, les entrées, le résultat attendu, les credentials requis et les effets externes ; consulter les schémas des nœuds disponibles ; réutiliser les patterns vérifiés.
   - Construire le graphe, valider les entrées et les chemins d'erreur, tester avec des fixtures, puis documenter le résultat. Conserver les secrets dans les credentials n8n adaptés.
   - Vérifier les doublons avant import et les changements distants avant modification. Ne pas remplacer un workflow existant sans connaître sa version et sa fonction.
   - Garder une courte mémoire locale des décisions et erreurs vérifiées, avec la version n8n concernée et sans données confidentielles.
   - L'activation et les actions réelles doivent respecter l'autorisation donnée pour le workflow concerné ; l'installation du laboratoire ne les autorise pas toutes.

7. Termine avec des preuves et un point de reprise.
   - Écris .data/bootstrap-status.md sans secrets : versions, services, chemins locaux, outils découverts, tests effectués, identifiant de l'exemple, limites et prochaine étape.
   - Donne séparément le statut de : démonstrations du dépôt, instance n8n, accès de gestion, création/import par l'agent, exécution par l'agent et persistance du volume.
   - Déclare « prêt pour créer et tester des workflows locaux avec cet agent » seulement si la création/import ET l'exécution de l'exemple ont été vérifiées via les outils de cet agent.
   - Ne présente pas cet environnement comme multi-tenant, hautement disponible ou validé à forte charge. La montée en charge nécessite des travaux et des mesures supplémentaires.
   - Si une étape attend une action de ma part, donne l'étape précise, sa raison et comment reprendre, sans annoncer une réussite complète.
```

## Prompt de reprise

Après avoir rempli une clé dans l'emplacement privé ou rechargé le client :

```text
Reprends l'installation d'Automation Systems Lab à partir de .data/bootstrap-status.md et docs/agent-bootstrap.md. Vérifie à nouveau les capacités disponibles et termine les étapes restantes sans recommencer ce qui a déjà réussi ni créer de workflows en double. Ne lis ni n'affiche de valeurs de secrets dans la conversation.
```

## Première demande après installation

```text
Dans mon environnement n8n local connecté, reproduis l'exemple de rapport mensuel du dépôt. Vérifie d'abord s'il existe déjà. Utilise les données fictives, conserve le workflow inactif, valide-le et exécute-le avec tes outils. Montre le résultat calculé et l'identifiant de l'exécution, puis documente localement ce qui a été vérifié.
```

## Capacités et limites

| Parcours | Ce qui existe dans le dépôt | Ce que l'installation assistée doit vérifier |
|---|---|---|
| Agent → laboratoire | Service HTTP, bridge MCP, contrats et tests | Configuration et accès du client utilisé |
| Agent → n8n | Exports, instance Compose et import local explicite | Connecteur de gestion distinct, credentials et exécution authentifiée |
| Reprise | Volume n8n et registre SQLite local | Services redémarrables, état d'installation consigné |
| Montée en charge | Architecture et feuille de route documentées | Aucun dimensionnement ou mode distribué installé par ce prompt |

La procédure est volontairement adaptative. Elle n'a pas encore été certifiée de bout en bout pour chaque application d'agent. Les tests CI existants vérifient les exemples et leurs interfaces, pas toutes les variantes d'installation possibles.

Sources du connecteur consultées lors de la rédaction : [installation locale](https://github.com/czlonkowski/n8n-mcp/blob/main/docs/SELF_HOSTING.md), [connexion au MCP natif n8n](https://github.com/czlonkowski/n8n-mcp/blob/main/docs/OFFICIAL_MCP_SETUP.md). La version publiée observée était `2.90.0` ; ce numéro n'est pas une certification de compatibilité avec votre environnement. Vérifiez les sources au moment de l'installation.
