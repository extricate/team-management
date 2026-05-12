# Ideas
~~- Auth: remove resend and implement basic username/password for management accounts; ~~
~~-- Take into consideration this application will be used offline without access to external services (aside from docker) - but make it enterprise hardened (we might host it on the internal network later)~~
~~-- Add user management interface (creating and enabling management accounts);~~
~~-- Add MFA OTA code in the auth process;~~

- Vacature publiceren: ja/nee als wens toevoegen in positie 
- Positiestatus: gewenst/toegezegd/gepland/etc.?
- Posities (arbeidsplaatsen) loskoppelen van teams (je financieert een positie en koppelt die aan een team)
- Add unique arbeidsplaatsnummers to positions
~~- Add unique personnel ID to employees~~
- When funding a position for the first time, store the intial funding source seperately from any future funding sources (to refer to later).

~~- Audit log entries currently just store the basic crud operations. Please also store the actual change to the relevant data fields (in plain text). Or figure out a better solution.~~

~~- Fix the default organization from user/settings not being applied in the various create new (of model) pages ("-- Kies een organisatie --" remains the default even with a set default; in new financial source, new employee, new team, new order.)~~

~~- Add user management interface (creating and enabling management accounts)~~
~~- Add notifications (with access through the navbar) with notifications regarding the conflicts (which are currently in the dashboard).~~
- Add sorting (on table headers?) on pages like employees, teams, finance sources, etc.
~~- Add notifications (with access through the navbar) with notifications regarding the conflicts (which are currently in the dashboard).~~
~~- Add sorting (on table headers?) on pages like employees, teams, finance sources, etc.~~
~~- Add financial requests other than personnel (which does deduct from financial sources, i.e. investeringen or matex): ATBs, etc.~~
- Export function for the entire database to an excel document
- Import function for the entire database from an excel document
- Easy backup functionality
- Make pages adaptive to smaller screen sizes
- Add documentation with descriptions on how to work with the application
-- Add relevant links to the documentation center from various pages
-- Docs should be added in code (preferably in their respective pages), considering the docs are tightly coupled to their respective UI functionality
~~- Add filters on pages like employees, teams, finance sources, etc., optimize for UX best practises.~~
~~- Easy drag 'n drop interface to quickly move team members to and from positions among teams~~
~~- An easy to display team + team members and position overview interface~~
~~- Add <title></title> for every page where appropriate.~~
~~- Make positions transferable to other teams~~
~~- add ability to remove funding~~


~~- Add ability to finance from company persex (which is an unlimited financial source, basically used for any positions that cannot be traced back to a specific other financial source). This does need to have a maximum but can be exceeded (give a % indicator >100%).~~

~~- Add ability to set a certain organisation entity as your personal default (to prevent having to click many times)~~

~~- Declutter navbar~~
~~- Add pre-commit hook that ups the version of the application in package.json. Maybe optionally automatically add a commit message as well, based on the changes inside the commit Maybe add a way to make an LLM/you as Claude Code write the commit message? Figure out a way. Use semantic versioning.~~