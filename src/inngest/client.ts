import { Inngest } from 'inngest'

export const inngest = new Inngest({ 
  id: 'grove-v1',
  eventKey: process.env.INNGEST_EVENT_KEY
})

// import { Inngest } from "inngest";

// // Create a client to send and receive events
// export const inngest = new Inngest({ id: "grove-v1" });