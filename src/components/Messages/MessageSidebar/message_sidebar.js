import React from 'react'
import { MessageSidebarButton } from './MessageSidebarButton/message_sidebar_button'
import './message_sidebar.css'


const images = ['https://i5.walmartimages.ca/images/Large/580/6_r/875806_R.jpg',
                'https://cdn.discordapp.com/attachments/431923743028412427/513601584748560384/image0.jpg',
'https://uwaterloo.ca/centre-for-teaching-excellence/sites/ca.centre-for-teaching-excellence/files/styles/sidebar-220px-wide/public/iclicker.png?itok=J1P1LRte',
'https://www.pearsonhighered.com/assets/bigcovers/0/1/3/1/0131374699.jpg',
'http://cuhsphysics.weebly.com/uploads/3/8/9/5/38955313/1484413_orig.png',
'https://target.scene7.com/is/image/Target/GUEST_3954d54d-41c2-4b87-8929-d60d47a574e6'];
const ids = [0, 1, 2, 3, 4, 5];
const titles = ["Singular Banana", "Single in La Jolla Palms", "iClicker", "AP CS Textbook", "Physics Textbook", "Couch"];
const active = [true];

const getConversations = ids.map((id) =>
  <MessageSidebarButton image={images[id]} title={titles[id]} active={active[id]}/>
);

const MessageSidebar = () => (
  <div className="message-sidebar">
    {getConversations}
  </div>
)

export default MessageSidebar