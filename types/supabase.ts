export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          uid: string;
          name: string;
          role: string;
        };
        Insert: {
          uid: string;
          name: string;
          role: string;
        };
        Update: {
          name?: string;
          role?: string;
        };
      };
    };
  };
}
