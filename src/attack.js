import { Configuration, OpenAIApi } from "openai";

export function init() {
    Hooks.on("midi-qol.AttackRollComplete", async (data) => {
        const apiKey = window.game.settings.get('foundryvtt-openai-assistant', 'OpenAIKey');

        const configuration = new Configuration({
        apiKey
        });
        const openai = new OpenAIApi(configuration);

        if(!apiKey) {
            console.error("OpenAI API Key is not set");
            // todo: show a message to the user
            // todo: unset the hook
            return;
        }

        const allTargets = data.targets;
    
        const hitTargets = [];
        const missTargets = [];
    
        for (let target of allTargets) {
            let isTargetFound = false;
            if(data.hitTargets && data.hitTargets.size > 0) {
                for(let hitTarget of data.hitTargets) {
                    if (hitTarget.data._id === target.data._id) {
                        hitTargets.push(target);
                        isTargetFound = true;
                    }
                }
            }
    
            if(!isTargetFound) {
                missTargets.push(target);
            }
        }
    
        const hitTargetsNames = hitTargets.map(t => t.data.name);
        const missTargetsNames = missTargets.map(t => t.data.name);
        const enemy = hitTargetsNames[0] || missTargetsNames[0];
        const willHit = hitTargetsNames.length > 0;
    
        const apiResponse = await generateAttackDescription({
            openai,
            weapon: data.item.data.name,
            character: data.actor.data.name,
            enemy: enemy,
            willHit: willHit
        });
    
        ChatMessage.create({
            speaker: {alias: "OpenAI Assistant"},
            content: apiResponse.result
        });
    });
}

async function generateAttackDescription({openai, weapon, character, enemy, willHit}) {
  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: generatePrompt({weapon, character, enemy, willHit}),
    temperature: 0.9,
    max_tokens: 200
  });

  return ({ choices: completion.data, result: completion.data.choices[0].text });
}

function generatePrompt({weapon, character, enemy, willHit = true}) {
    const willHitText = willHit ? 'The attack hits' : 'The attack misses.';

    return `Suggest a description of an attack for a weapon or spell in a dungeons and dragons 5th edition game. Whether the attack hits or misses is defined by the text after "Hit:". The attack is not lethal.

    Character Name: ${character}
    Weapon: Rapier
    Hit: The attack hits
    Description: ${character} plunges the rapier toward the ${enemy}'s throat, the blood gushes out onto the floor.
    Character Name: ${character}
    Weapon: Rapier
    Hit: The attack hits
    Description: ${character} stabs the rapier into the ${enemy}'s chest and into its heart. The life goes out of the ${enemy}'s orc eyes before crumbling.
    Weapon: Rapier
    Hit: The attack misses
    Description: ${character} plunges the rapier toward the ${enemy}'s throat, the ${enemy} forcefully pushes the weapon away.
    Weapon: Rapier
    Hit: The attack misses
    Description: ${character} stabs the rapier into the ${enemy}'s chest. The ${enemy}'s armor blocks the hit and only leaves a scratch.
    Weapon: Bow
    Hit: The attack misses
    Description: ${character} shoots the bow at the ${enemy}'s knee but misses it by a foot.
    Weapon: Bow
    Hit: The attack misses
    Description: ${character} shoots the bow at the ${enemy}'s head, but it ducks under the attack.
    Weapon: ${weapon}
    Hit: ${willHitText}
    Description:`;
}
