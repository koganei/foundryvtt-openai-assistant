/*
 * Create a custom config setting
 */
export async function init() {
    Hooks.on("init", async () => {
        await window.game.settings.register('foundryvtt-openai-assistant', 'OpenAIKey', {
            name: 'OpenAI API Key', // can also be an i18n key
            hint: 'API Key for OpenAI (generated from https://openai.com/api/)', // can also be an i18n key
            scope: 'world',     // "world" = sync to db, "client" = local storage
            config: true,       // false if you dont want it to show in module config
            type: String,       // Number, Boolean, String, or even a custom class or DataModel
            default: '',
            onChange: value => { // value is the new value of the setting
              console.log('value changed', value)
            },
            filePicker: false,  // set true with a String `type` to use a file picker input,
            requiresReload: true, // when changing the setting, prompt the user to reload
          });

        await window.game.settings.register('foundryvtt-openai-assistant', 'displayAttackDescription', {
            name: 'Display Attack Description ', // can also be an i18n key
            hint: 'If enabled, will chat out a description of the attack', // can also be an i18n key
            scope: 'world',     // "world" = sync to db, "client" = local storage
            config: true,       // false if you dont want it to show in module config
            type: Boolean,       // Number, Boolean, String, or even a custom class or DataModel
            default: false,
            onChange: value => { // value is the new value of the setting
              console.log('value changed', value)
            },
            filePicker: false,  // set true with a String `type` to use a file picker input,
            requiresReload: false, // when changing the setting, prompt the user to reload
          });

        await window.game.settings.register('foundryvtt-openai-assistant', 'restrictAttackToGM', {
            name: 'Whisper Attack Description to GM Only ', // can also be an i18n key
            hint: 'If enabled, will whisper the attack description to the GM to use as inspiration', // can also be an i18n key
            scope: 'world',     // "world" = sync to db, "client" = local storage
            config: true,       // false if you dont want it to show in module config
            type: Boolean,       // Number, Boolean, String, or even a custom class or DataModel
            default: true,
            onChange: value => { // value is the new value of the setting
              console.log('value changed', value)
            },
            filePicker: false,  // set true with a String `type` to use a file picker input,
            requiresReload: false, // when changing the setting, prompt the user to reload
          });

        await window.game.settings.register('foundryvtt-openai-assistant', 'displayAttackBubbles', {
            name: 'Display Attack Chat Reactions', // can also be an i18n key
            hint: 'If enabled, will display reactions in bubbles over the attacker and its target', // can also be an i18n key
            scope: 'world',     // "world" = sync to db, "client" = local storage
            config: true,       // false if you dont want it to show in module config
            type: Boolean,       // Number, Boolean, String, or even a custom class or DataModel
            default: true,
            onChange: value => { // value is the new value of the setting
              console.log('value changed', value)
            },
            filePicker: false,  // set true with a String `type` to use a file picker input,
            requiresReload: false, // when changing the setting, prompt the user to reload
          });
    });
}
