# zeochat - zeochat.com
> Peer-to-peer video client chat that uses WebRTC and websockets to connect directly with peers without proxying requests

![alt text](https://image.ibb.co/jSUig8/Screen_Shot_2018_07_24_at_21_08_33.png "zeochat.com")

This is a work in progress and test learning project for a few technologies - Most notable WebRTC and Ziet Now

### Highlights
- 7 isolated services
- NSFW classifier for offensive content
- Automated blue-green deployment using Zeit Now
- Compilation of static sites using handlebars
- WebRTC and websockets connect and communicate through ICE and STUN
- Mobile optimised

### TODO
- all - abstract away remove secrets and keys for github
- web - removing the ugly resizing of components when video streams are loaded for remote and local
- admin - flag talk to next person
- web - home page blurb and info
- classifier - investigate smaller docker containers
- socket - rate limit next requests
- match - implement banning
- admin - ban whitelisting
- match - add db indexes
- web - messaging to let people know about waiting
- web - add mute button

### TODO (Closed)
- ~~socket - closed websockets get removed from status list~~
- ~~socket - status list is cleaned to remove dead sockets~~
- ~~web - s3 deploy files~~
- ~~web - grunt to create handlebars and deploy versions for js and css assets~~
- ~~web - bundle css~~
- ~~proxy - transfer zeochat.com domain and alias with bucket~~
- ~~web - ensure that js and socket calls go to now services~~
- ~~web - version id changes when deploying~~
- ~~match - avoid list~~
- ~~web - google analytics~~
- ~~web - page transitions animation~~
- ~~web - error handling for guests~~
- ~~web - moving text title~~
- ~~web - destroy moving text title animation when chatting~~
- ~~socket - show common interests~~
- ~~web - show typing~~
- ~~web - add logo overlays~~
- ~~web - remember interests in sessionstorage~~
- ~~match - bug - often goes to waiting, when should be finding~~
- ~~web - bug - addChat textcontent null~~
- ~~web - feedback and improvements button~~
- ~~watch admin - sort archive by live users and date~~
- web - mobile view, set heights, widths correctly