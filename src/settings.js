/*
 * Create a custom config setting
 */
export async function init() {
    Hooks.on("init", async () => {
        await window.game.settings.register('foundryvtt-openai-assistant', 'OpenAIKey', {
            name: 'OpenAI API Key', // can also be an i18n key
            hint: 'API Key for OpenAI', // can also be an i18n key
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
    });
}
