CONFIG.debug.hooks = true;
console.log("OpenAI Assistant is loading...");
Hooks.on("midi-qol.AttackRollComplete", async (data) => {
    //debugger;
    // return;
    console.log('========== AttackRollComplete', data.hitTargets, data);

    const allTargets = data.targets;

    const hitTargets = [];
    const missTargets = [];

    for (let target of allTargets) {
        let isTargetFound = false;
        if(data.hitTargets && data.hitTargets.size > 0) {
            console.log("============= Checking hit targets", data.hitTargets);
            for(let hitTarget of data.hitTargets) {
                if (hitTarget.data._id === target.data._id) {
                    console.log("============= Found hit target", hitTarget.data.name)
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

    console.log("=============================== Someone just hit!", {
        data,
        actor: data.actor.data.name,
        hitTargets,
        missTargets,
        hitTargetsNames,
        missTargetsNames,
        item: data.item.data.name,
    });
    
    console.log('====== fetching desc');
    const response = await fetch('http://localhost:3000/api/attack', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            animal: data.item.data.name,
            character: data.actor.data.name,
            enemy: enemy,
            willHit: willHit
        }),
    });
    const apiResponse = await response.json();

    ChatMessage.create({
        speaker: {alias: "OpenAI Assistant"},
        content: apiResponse.result
      });
    console.log('=========== OpenAI response:', apiResponse);
});
