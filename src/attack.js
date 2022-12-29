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
            willHit: willHit
        });
    
        generateChatMessages(data, description, hitTargets, missTargets);
    });
}

function generateChatMessages(data, description, hitTargets, missTargets) {


    if(game.settings.get('foundryvtt-openai-assistant', 'displayAttackDescription')) {
        const whisper = game.settings.get('foundryvtt-openai-assistant', 'restrictAttackToGM') ? ChatMessage.getWhisperRecipients("gm"): undefined;
        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: game.actors.get(data.actor.data.name) }),
            content: `<i>${description.description}</i>`,
            whisper,
            type: 2
        });
    }

    if(game.settings.get('foundryvtt-openai-assistant', 'displayAttackBubbles')) {
        const attackerToken = canvas.tokens.get(data.tokenId);
        canvas.hud.bubbles.say(attackerToken, description.attackerQuip);

        const targetId = hitTargets.length ? hitTargets[0].data._id : missTargets[0].data._id;

        const targetToken = canvas.tokens.get(targetId);
        canvas.hud.bubbles.say(targetToken, description.targetQuip);
    }
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

async function generateAttackDescription({openai, weapon, character, enemy, willHit}) {
    const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: generatePrompt({weapon, character, enemy, willHit}),
        temperature: 0.9,
        max_tokens: 200
    });

    const result = JSON.parse(completion.data.choices[0].text.replace(/[\n]/g, ''));
    const description = result.description;
    const attackerQuip = result.attackerQuip;
    const targetQuip = result.targetQuip;

  return ({ choices: completion.data, description, attackerQuip, targetQuip });
}


function generatePrompt({weapon, character, enemy, willHit = true}) {
    const willHitText = willHit ? 'The attack hits' : 'The attack misses.';

    return `Repeat the last item of the array adding a suggestion for a description of an attack for a weapon or spell in a dungeons and dragons 5th edition game in the "description" property. Whether the attack hits or misses is defined by the text in the "hit" property. The attack is not lethal. Also suggest a sentence or quip said by the attacking character in the "attackQuip" property, as well as a verbal reaction from the target in the "targetReply" property.
            Make sure that the result is in a valid JSON format, repeating the last item of the array.

    [{
        "character": "${character}",
        "weapon": "Rapier",
        "enemy": "${enemy}",
        "hit": "The attack hits",
        "description": "${character} plunges the rapier toward the ${enemy}'s throat, the blood gushes out onto the floor.",
        "attackerQuip": "Have at you!",
        "targetQuip": "You got me!"
    }, {
        "character": "${character}",
        "weapon": "Rapier",
        "enemy": "${enemy}",
        "hit": "The attack hits",
        "description": "${character} stabs the rapier into the ${enemy}'s chest and into its heart. The life goes out of the ${enemy}'s orc eyes before crumbling.",
        "attackerQuip": "Take that!",
        "targetQuip": "Please... have mercy..."
    }, {
        "character": "${character}",
        "weapon": "Rapier",
        "enemy": "${enemy}",
        "hit": "The attack misses",
        "description": "${character} plunges the rapier toward the ${enemy}'s throat, the ${enemy} forcefully pushes the weapon away.",
        "attackerQuip": "Come here you!",
        "targetQuip": "Hah, you missed!"
    }, {
        "character": "${character}",
        "weapon": "Rapier",
        "enemy": "${enemy}",
        "hit": "The attack misses",
        "description": "${character} stabs the rapier into the ${enemy}'s chest. The ${enemy}'s armor blocks the hit and only leaves a scratch.",
        "attackerQuip": "You can't beat me",
        "targetQuip": "Better luck next time"
    }, {
        "character": "${character}",
        "weapon": "Bow",
        "enemy": "${enemy}",
        "hit": "The attack misses",
        "description": "${character} shoots the bow at the ${enemy}'s knee but misses it by a foot.",
        "attackerQuip": "You're going down!",
        "targetQuip": "I'm over here!"
    }, {
        "character": "${character}",
        "weapon": "Bow",
        "enemy": "${enemy}",
        "hit": "The attack misses",
        "description": "${character} shoots the bow at the ${enemy}'s head, but it ducks under the attack.",
        "attackerQuip": "Head shot!",
        "targetQuip": "Not on my watch!"
    }, {
        "character": "${character}",
        "weapon": "${weapon}",
        "enemy": "${enemy}",
        "hit": "${willHitText}",
        "description": "",
        "attackerQuip": "",
        "targetQuip": ""
    }]`;
}

