<img src="https://assets.monei.com/images/logo.svg" alt="MONEI" width="180">

<h1>Salesforce Commerce Cloud MONEI link Cartridge</h1>
MONEI link cartridge for integrating the payment service with Salesforce Commerce Cloud (SFCC). This cartridge supports SFRA version 5.x.x & 6.x.x.

<h2>Requirements</h2>

It is required to have a MONEI account to use the cartridge, you can register <a href="https://dashboard.monei.com/settings">here</a>
If you have any questions or concerns, please visit https://support.monei.com/ and contact us

<h2>Useful pages</h2>

1. <a href="https://docs.monei.com/docs/">Technical documentation</a>
2. <a href="https://docs.monei.com/api/">API references</a>
3. <a href="https://docs.monei.com/docs/testing/">Testing documentation</a>

<h2>Basic cartridge installation instructions</h2>

1. Clone the repository
2. Insert the int_monei_sfra cartridge into the cartridge folder
3. Unzip metadata_monei.zip and import the meta data required for the cartridge to work correctly
4. Run the build scripts (reference the Build section)
5. Modify the dw.json file with the user, pass and the corresponding version of code to be able to debug in the sandbox and synchronize the code
6. Check documentation/Integration_guide.docx for more integration details and configurations

<h2>Build</h2>

Run the command 
<code>npm install</code>
for installing the required dependency packages

run the command
<code>npm run build</code>
for building the static resources required for the cartridge to work correctly

<h2>Licence</h2>

MIT license, see <a href="https://github.com/MONEI/MONEI-Salesforce-Commerce-Cloud/blob/main/LICENSE">LICENSE</a> section