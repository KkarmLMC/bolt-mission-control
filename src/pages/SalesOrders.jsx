import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, MagnifyingGlass, CaretRight, Plus } from '@phosphor-icons/react'
import { db } from '../lib/supabase.js'
import { soStatus } from '../lib/statusColors.js'

