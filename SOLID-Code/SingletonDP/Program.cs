namespace SingletonDP
{

    internal class Program
    {
        //public class NonSingleton
        //{
        //    public void Method()
        //    {
        //        //logic
        //    }
        //}

        //static void Main(string[] args)
        //{
        //    NonSingleton obj = new NonSingleton();
            
        //    obj.Method();
        //}

        static void Main(string[] args)
        {
            Singleton obj = Singleton.GetInstance();

            obj.Method();
        }
    }

    


    
    //Thread Safe Singleton Pattern

    public sealed class Singleton
    {
        private static Singleton instance = null;     

        private Singleton()
        {
        }

        private static readonly object padlock = new object();

        public static Singleton GetInstance()
        {
            lock (padlock)
            {
                if (instance == null)
                {
                    instance = new Singleton();
                }
                return instance;
            }
        }

        public void Method()
        {
            //logic..
        }
    }

}

