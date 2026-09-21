import {readProgress,writeProgress,validateProgress} from '../services/progress.js';
import {itemExists} from '../services/catalog.js';
export async function list(req,res){res.json({records:await readProgress(req.user.id)});}
export async function save(req,res){const input=validateProgress(req.body);if(!input||!await itemExists(input.kind,input.item))return res.status(400).json({error:'Invalid progress item.'});res.json({records:await writeProgress(req.user.id,input)});}
