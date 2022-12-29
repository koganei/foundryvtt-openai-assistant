import { Configuration, OpenAIApi } from "openai";

export function init() {
    const hookId = Hooks.on("midi-qol.AttackRollComplete", async (data) => {
        const openai = configureOpenAI();

        if(!openai) {
            onNoApiKey(hookId);
            return;
        }

        const {hitTargets, missTargets, hitTargetsNames, missTargetsNames} = getHitAndMissTargets(data);

        const enemy = hitTargetsNames[0] || missTargetsNames[0];
        const willHit = hitTargetsNames.length > 0;
    
        const description = await generateAttackDescription({
            openai,
            weapon: data.item.data.name,
            character: data.actor.data.name,
            enemy: enemy,
            willHit: willHit,
            characterInfo: data.actor,
            enemyInfo: hitTargets[0] || missTargets[0]
        });
    
        generateChatMessages(data, description, hitTargets, missTargets);
    });
}

function generateChatMessages(data, description, hitTargets, missTargets) {


    if(game.settings.get('foundryvtt-openai-assistant', 'displayAttackDescription') && shouldDisplay(game.settings.get('foundryvtt-openai-assistant', 'attackDescriptionRate'))) {
        const whisper = game.settings.get('foundryvtt-openai-assistant', 'restrictAttackToGM') ? ChatMessage.getWhisperRecipients("gm"): undefined;
        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: game.actors.get(data.actor.data.name) }),
            content: `<i>${description.description}</i>`,
            whisper,
            type: 2
        });
    }

    if(game.settings.get('foundryvtt-openai-assistant', 'displayAttackBubbles') && shouldDisplay(game.settings.get('foundryvtt-openai-assistant', 'attackBubblesRate'))) {
        const attackerToken = canvas.tokens.get(data.tokenId);
        canvas.hud.bubbles.say(attackerToken, description.attackerQuip);

        const targetId = hitTargets.length ? hitTargets[0].data._id : missTargets[0].data._id;

        const targetToken = canvas.tokens.get(targetId);
        canvas.hud.bubbles.say(targetToken, description.enemyQuip);

        console.log('======================= attack bubbles', {
            attackerToken,
            targetToken,
            targetId
        });
    }
}

function extractJSONStringFromText(text) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}') + 1;
    return text.substring(start, end);
}

function shouldDisplay(rate) {
    return Math.floor(Math.random() * 100) <= rate;
}

function getHitAndMissTargets(data) {
    const allTargets = data.targets;

    const hitTargets = [];
    const missTargets = [];

    for (let target of allTargets) {
        let isTargetFound = false;
        if (data.hitTargets && data.hitTargets.size > 0) {
            for (let hitTarget of data.hitTargets) {
                if (hitTarget.data._id === target.data._id) {
                    hitTargets.push(target);
                    isTargetFound = true;
                }
            }
        }

        if (!isTargetFound) {
            missTargets.push(target);
        }
    }

    const hitTargetsNames = hitTargets.map(t => t.data.name);
    const missTargetsNames = missTargets.map(t => t.data.name);

    return {hitTargets, missTargets, hitTargetsNames, missTargetsNames};
}

function configureOpenAI() {
    const apiKey = game.settings.get('foundryvtt-openai-assistant', 'OpenAIKey');
    if(!apiKey) { return false; }

    const configuration = new Configuration({
        apiKey
    });

    return new OpenAIApi(configuration);
}

function onNoApiKey() {
    ui.notifications.warn("OpenAI API Key is not set. Descriptions will not be generated.");
    setTimeout(() => {
        Hooks.off("midi-qol.AttackRollComplete", hookId);
    }, 1);
}

async function generateAttackDescription({openai, weapon, character, enemy, willHit, characterInfo, enemyInfo}) {
    const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: generatePrompt({weapon, character, enemy, willHit, characterInfo, enemyInfo}),
        temperature: 0.9,
        max_tokens: 200
    });

    const result = JSON.parse(extractJSONStringFromText(completion.data.choices[0].text.replace(/[\n]/g, '')));
    const description = result.description;
    const attackerQuip = result.attackerQuip;
    const enemyQuip = result.enemyQuip;

  return ({ choices: completion.data, description, attackerQuip, enemyQuip });
}

function getCharacterDetails(characterInfo) {
    return characterInfo?.data?.data?.details ||
        characterInfo?.data?.document?._actor?.labels ||
        {};
}

function generatePrompt({weapon, character, enemy, willHit = true, characterInfo = {}, enemyInfo = {}}) {
    const willHitText = willHit ? 'The attack hits' : 'The attack misses.';

    const characterDetails = getCharacterDetails(characterInfo);
    const enemyDetails = getCharacterDetails(enemyInfo);

    console.log({characterDetails, enemyDetails});

    return `
    Repeat the last item of the sample answers array adding a suggestion for a description of an attack for a weapon or spell in a dungeons and dragons 5th edition game in the "description" property. Whether the attack hits or misses is defined by the text in the "hit" property. The attack is not lethal. Also suggest a sentence or quip said by the attacking character in the "attackQuip" property, as well as a verbal reaction from the target in the "targetReply" property.
    Make sure that your answer is in a valid JSON format, repeating the last item of the array with no extra text around it.

    Information about the attacker:
    {
        "attacker": "${character}",
        "details": "${JSON.stringify(characterDetails, null, 4)}"
    }

    Information about the enemy:
    {
        "enemy": "${enemy}",
        "details": "${JSON.stringify(enemyDetails, null, 4)}"
    }

    Sample answers array:
    [{
        "character": "${character}",
        "weapon": "Rapier",
        "enemy": "${enemy}",
        "hit": "The attack hits",
        "description": "${character} plunges the rapier toward the ${enemy}'s throat, the blood gushes out onto the floor.",
        "attackerQuip": "Have at you!",
        "enemyQuip": "You got me!"
    }, {
        "character": "${character}",
        "weapon": "Rapier",
        "enemy": "${enemy}",
        "hit": "The attack hits",
        "description": "${character} stabs the rapier into the ${enemy}'s chest and into its heart. The life goes out of the ${enemy}'s orc eyes before crumbling.",
        "attackerQuip": "Take that!",
        "enemyQuip": "Please... have mercy..."
    }, {
        "character": "${character}",
        "weapon": "Rapier",
        "enemy": "${enemy}",
        "hit": "The attack misses",
        "description": "${character} plunges the rapier toward the ${enemy}'s throat, the ${enemy} forcefully pushes the weapon away.",
        "attackerQuip": "Come here you!",
        "enemyQuip": "Hah, you missed!"
    }, {
        "character": "${character}",
        "weapon": "Rapier",
        "enemy": "${enemy}",
        "hit": "The attack misses",
        "description": "${character} stabs the rapier into the ${enemy}'s chest. The ${enemy}'s armor blocks the hit and only leaves a scratch.",
        "attackerQuip": "You can't beat me",
        "enemyQuip": "Better luck next time"
    }, {
        "character": "${character}",
        "weapon": "Bow",
        "enemy": "${enemy}",
        "hit": "The attack misses",
        "description": "${character} shoots the bow at the ${enemy}'s knee but misses it by a foot.",
        "attackerQuip": "You're going down!",
        "enemyQuip": "I'm over here!"
    }, {
        "character": "${character}",
        "weapon": "Bow",
        "enemy": "${enemy}",
        "hit": "The attack misses",
        "description": "${character} shoots the bow at the ${enemy}'s head, but it ducks under the attack.",
        "attackerQuip": "Head shot!",
        "enemyQuip": "Not on my watch!"
    }, {
        "character": "${character}",
        "weapon": "${weapon}",
        "enemy": "${enemy}",
        "hit": "${willHitText}",
        "description": "",
        "attackerQuip": "",
        "enemyQuip": ""
    }]`;
}

