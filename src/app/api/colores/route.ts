import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('colores')
      .select('*')
      .order('color');
      
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching colores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch colores' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  
  if (!body.color) {
    return NextResponse.json(
      { error: 'Color name is required' },
      { status: 400 }
    );
  }
  
  try {
    const { data, error } = await supabase
      .from('colores')
      .insert({ color: body.color })
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      color: data
    });
  } catch (error) {
    console.error('Error creating color:', error);
    return NextResponse.json(
      { error: 'Failed to create color' },
      { status: 500 }
    );
  }
}