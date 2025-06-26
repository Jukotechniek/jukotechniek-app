import React, { useEffect, useState } from 'react';
import type { DateRange, DayProps } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VacationRequest } from '@/types/vacation';
import TechnicianFilter from './TechnicianFilter';

interface Technician { id: string; full_name: string }
type RequestTab = 'pending' | 'approved' | 'denied'
type Modifiers = Record<string, Date[]>
type ModifierClasses = Record<string, string>

// helper to format a Date as local "YYYY-MM-DD"
function formatDateLocal(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const WorkSchedulePage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const role      = user?.role?.toLowerCase() || ''
  const isPlanner = ['admin','opdrachtgever','administrator'].includes(role)
  const isAdmin   = ['admin','administrator'].includes(role)

  const [technicians, setTechnicians]       = useState<Technician[]>([])
  const [selectedTech, setSelectedTech]     = useState<string>('all')
  const [workDays, setWorkDays]             = useState<Date[]>([])
  const [allSchedules, setAllSchedules]     = useState<Modifiers>({})
  const [techColors, setTechColors]         = useState<Record<string,string>>({})
  const [requests, setRequests]             = useState<VacationRequest[]>([])
  const [requestTab, setRequestTab]         = useState<RequestTab>('pending')
  const [vacationRange, setVacationRange]   = useState<DateRange|undefined>(undefined)
  const [isVacDialogOpen, setVacDialogOpen] = useState<boolean>(false)
  const [fullscreen, setFullscreen]         = useState<boolean>(false)

  const colors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#f97316']

  useEffect(() => {
    if (!isPlanner && user?.id) setSelectedTech(user.id)
  }, [isPlanner, user])

  async function fetchTechnicians() {
    const { data } = await supabase.from('profiles').select('id, full_name')
    const list = data || []
    const visible = isPlanner
      ? [{ id: 'all', full_name: 'Alle monteurs' }, ...list]
      : list.filter(t => t.id === user?.id)
    const cmap: Record<string,string> = {}
    visible.forEach((t,i) => { if (t.id!=='all') cmap[t.id] = colors[i%colors.length] })
    setTechnicians(visible)
    setTechColors(cmap)
  }

  async function fetchSchedule(id: string) {
    if (id==='all') {
      const { data } = await supabase.from('work_schedules').select('*')
      const map: Modifiers = {}
      ;(data||[]).filter(r=>r.is_working).forEach(r=>{
        map[r.technician_id] = map[r.technician_id]||[]
        map[r.technician_id].push(new Date(r.date))
      })
      setAllSchedules(map)
      setWorkDays([])
    } else {
      const { data } = await supabase
        .from('work_schedules').select('*').eq('technician_id', id)
      setWorkDays((data||[]).filter(r=>r.is_working).map(r=>new Date(r.date)))
      setAllSchedules({})
    }
  }

  async function fetchRequests() {
    let q = supabase.from('vacation_requests')
      .select('*, profiles!vacation_requests_technician_id_fkey(full_name)')
      .order('start_date')
    if (!isAdmin) q = q.eq('technician_id', user?.id||'')
    const { data } = await q
    setRequests((data||[]).map(r=>({
      id:             r.id,
      technicianId:   r.technician_id,
      technicianName: r.profiles?.full_name||'',
      startDate:      r.start_date,
      endDate:        r.end_date,
      status:         r.status as VacationRequest['status'],
      approvedBy:     (r as any).approved_by,
    })))
  }

  useEffect(()=>{
    fetchTechnicians()
    fetchRequests()
  },[])

  useEffect(()=>{
    if (selectedTech) fetchSchedule(selectedTech)
  },[selectedTech])

  // build approved vacation map
  const vacSchedules: Modifiers = {}
  requests.filter(r=>r.status==='approved').forEach(r=>{
    const s=new Date(r.startDate), e=new Date(r.endDate)
    for(let d=new Date(s); d<=e; d.setDate(d.getDate()+1)){
      vacSchedules[r.technicianId] = vacSchedules[r.technicianId]||[]
      vacSchedules[r.technicianId].push(new Date(d))
    }
  })
  const vacationDays = Object.values(vacSchedules).flat()

  // custom Day cell for 'all' view
  const CustomDay = ({ date, ...props }: DayProps) => {
    const ds = date.toDateString()
    const workTechs = Object.entries(allSchedules)
      .filter(([,dates])=>dates.some(d=>d.toDateString()===ds)).map(([id])=>id)
    const vacTechs = Object.entries(vacSchedules)
      .filter(([,dates])=>dates.some(d=>d.toDateString()===ds)).map(([id])=>id)
    // Compute isSelected based on selected workDays
    const isSelected = workDays.some(d => d.toDateString() === ds)
    return (
      <button
        {...props}
        className={`relative p-1 text-center ${isSelected?' ring-2 ring-offset-2 ring-gray-500':''}`}
      >
        <span>{date.getDate()}</span>
        {workTechs.length>0 && (
          <div className="absolute top-1 left-0 right-0 flex justify-center space-x-0.5">
            {workTechs.map(id=>(
              <span key={id}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: techColors[id] }}
              />
            ))}
          </div>
        )}
        {vacTechs.length>0 && (
          <div className="absolute bottom-1 left-0 right-0 flex justify-center space-x-0.5">
            {vacTechs.map(id=>(
              <span key={id}
                className="w-2 h-2 rounded-full border border-current"
                style={{ color: techColors[id] }}
              />
            ))}
          </div>
        )}
      </button>
    )
  }

  // SAVE WORKDAYS with local date formatting
  async function saveWorkDays() {
    if (!isPlanner || selectedTech==='all') return
    await supabase.from('work_schedules')
      .delete().eq('technician_id', selectedTech)
    const inserts = workDays.map(d=>({
      technician_id: selectedTech,
      date:          formatDateLocal(d),
      is_working:    true
    }))
    const { error } = await supabase.from('work_schedules').insert(inserts)
    if (error) toast({ title:'Error', description:error.message, variant:'destructive' })
    else     toast({ title:'Werkdagen opgeslagen' })
    fetchSchedule(selectedTech)
  }

  async function deleteWorkDays() {
    if (!isPlanner || selectedTech==='all') return
    await supabase.from('work_schedules')
      .delete().eq('technician_id', selectedTech)
    toast({ title:'Werkdagen verwijderd' })
    setWorkDays([])
  }

  function fillWorkDays() {
    if (!isPlanner || selectedTech==='all') return
    const days: Date[] = []
    const now=new Date(), y=now.getFullYear(), m=now.getMonth()
    for(let d=new Date(y,m,1); d<=new Date(y,m+1,0); d.setDate(d.getDate()+1)){
      if(d.getDay()>0&&d.getDay()<6) days.push(new Date(d))
    }
    setWorkDays(days)
  }

  // ADD VACATION with local date formatting
  async function addVacation() {
    if(!isPlanner||selectedTech==='all'||!vacationRange?.from||!vacationRange.to) return
    const start = formatDateLocal(vacationRange.from)
    const end   = formatDateLocal(vacationRange.to)
    const { error } = await supabase.from('vacation_requests').insert([{
      technician_id: selectedTech,
      start_date:    start,
      end_date:      end,
      status:        'pending'
    }])
    if(error) toast({ title:'Error', description:error.message, variant:'destructive' })
    else {
      toast({ title:'Vakantie aangevraagd' })
      setVacDialogOpen(false)
      setVacationRange(undefined)
      fetchRequests()
    }
  }

  async function updateStatus(id:string,status:'approved'|'denied') {
    await supabase.from('vacation_requests')
      .update({ status, approved_by:user?.id }).eq('id',id)
    toast({ title:status==='approved'?'Goedgekeurd':'Afgewezen' })
    fetchRequests(); fetchSchedule(selectedTech)
  }

  async function deleteVacation(id:string) {
    await supabase.from('vacation_requests').delete().eq('id',id)
    toast({ title:'Aanvraag verwijderd' })
    fetchRequests(); fetchSchedule(selectedTech)
  }

  const modifiers: Modifiers = { work: workDays, vacation: vacationDays, ...allSchedules }
  const classes: ModifierClasses = {
    work: 'bg-red-500 text-white',
    vacation: 'bg-green-500 text-white',
    ...techColors
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-6">
        {isPlanner && (
          <TechnicianFilter
            technicians={technicians.map(t=>({ id:t.id, name:t.full_name }))}
            selectedTechnician={selectedTech}
            onTechnicianChange={setSelectedTech}
          />
        )}
        <Card>
          <CardHeader><CardTitle>Agenda</CardTitle></CardHeader>
          <CardContent className="overflow-visible">
            <Calendar
              mode="multiple"
              selected={selectedTech==='all'?undefined:workDays}
              onSelect={dates=>{
                if (selectedTech==='all') return
                setWorkDays(dates as Date[])
              }}
              modifiers={modifiers}
              modifiersClassNames={classes}
              components={ selectedTech==='all'?{ Day: CustomDay } : {} }
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedTech!=='all' && (
                <>
                  <Button onClick={fillWorkDays}>Vul werkdagen</Button>
                  <Button onClick={saveWorkDays}>Opslaan werkdagen</Button>
                  <Button variant="destructive" onClick={deleteWorkDays}>Verwijder werkdagen</Button>
                  <Dialog open={isVacDialogOpen} onOpenChange={setVacDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Vakantie toevoegen</Button>
                    </DialogTrigger>
                    <DialogContent className="space-y-4">
                      <h3 className="text-lg font-medium">Vakantie aanvragen</h3>
                      <Calendar
                        mode="range"
                        selected={vacationRange}
                        onSelect={setVacationRange}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={()=>setVacDialogOpen(false)}>Sluiten</Button>
                        <Button onClick={addVacation} disabled={!(vacationRange?.from&&vacationRange.to)}>
                          Sla vakantie op
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legenda */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 bg-red-500 inline-block"/><span>Werkdag</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 bg-green-500 inline-block"/><span>Vakantie</span>
          </div>
          {selectedTech==='all' && technicians.filter(t=>t.id!=='all').map(t=>(
            <div key={t.id} className="flex items-center space-x-1">
              <span className={`w-3 h-3 inline-block ${techColors[t.id]}`}/><span>{t.full_name}</span>
            </div>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>Aanvragen</CardTitle></CardHeader>
          <CardContent>
            <Tabs value={requestTab} onValueChange={v=>setRequestTab(v as RequestTab)}>
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Goedgekeurd</TabsTrigger>
                <TabsTrigger value="denied">Afgekeurd</TabsTrigger>
              </TabsList>
              <TabsContent value="pending">
                {requests.filter(r=>r.status==='pending').map(r=>(
                  <div key={r.id} className="flex justify-between items-center mb-2">
                    <span>{r.technicianName} {r.startDate} - {r.endDate}</span>
                    {isAdmin && (
                      <div className="space-x-2">
                        <Button size="sm" onClick={()=>updateStatus(r.id,'approved')}>Akkoord</Button>
                        <Button size="sm" variant="outline" onClick={()=>updateStatus(r.id,'denied')}>Weiger</Button>
                        <Button size="sm" variant="destructive" onClick={()=>deleteVacation(r.id)}>Verwijder</Button>
                      </div>
                    )}
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="approved">
                {requests.filter(r=>r.status==='approved').map(r=>(
                  <div key={r.id} className="flex justify-between items-center mb-2">
                    <span>{r.technicianName} {r.startDate} - {r.endDate}</span>
                    <Button size="sm" variant="destructive" onClick={()=>deleteVacation(r.id)}>Verwijder</Button>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="denied">
                {requests.filter(r=>r.status==='denied').map(r=>(
                  <div key={r.id} className="flex justify-between items-center mb-2">
                    <span>{r.technicianName} {r.startDate} - {r.endDate}</span>
                    <Button size="sm" variant="destructive" onClick={()=>deleteVacation(r.id)}>Verwijder</Button>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default WorkSchedulePage
