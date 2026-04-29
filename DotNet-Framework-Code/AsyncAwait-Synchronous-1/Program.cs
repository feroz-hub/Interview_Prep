namespace AsyncAwait_Synchronous_1
{
    public class Program
    {
        //Synchronous Programming 
        public static int Method1()
        {
            Thread.Sleep(500);
            return 10;
        }

        public static int Method2()
        {
            return 20;
        }

        public static int Method3()
        {
            return 30;
        }

        public static void Main(string[] args)
        {
            Console.WriteLine(Method1());

            Console.WriteLine(Method2());

            Console.WriteLine(Method3());
        }
        //Output 10 20 30

    }

}
